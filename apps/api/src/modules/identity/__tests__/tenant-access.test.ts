import type { ExecutionContext } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { auditLog } from "../../audit/infrastructure/audit-log.table";
import type { AppError } from "../../../common/errors/app-error";
import { RequireTenantGuard } from "../api/require-tenant.guard";
import { IdentityService } from "../application/identity.service";
import { TENANT_ACCESS_CACHE_MS, TenantAccess } from "../application/tenant-access";
import type { AuthContext } from "../domain/auth-context";
import { memberships } from "../infrastructure/tables/memberships.table";
import { tenants } from "../infrastructure/tables/tenants.table";

describe("tenant access is checked against the database (M3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  /** Runs the real guard as if a request carried this (token-derived) auth context. */
  const guard = async (auth: AuthContext) => {
    const req: { auth: AuthContext; tenantAccess?: unknown } = { auth };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    try {
      await t.app.get(RequireTenantGuard).canActivate(ctx);
      return { ok: true, req };
    } catch (e) {
      return { ok: false, code: (e as AppError).code, req };
    }
  };
  const owner = async () => {
    const { response } = await registerOwner(new TestClient(t.app));
    return { userId: response.user.id, tenantId: response.activeTenantId! };
  };
  const setMembership = (
    userId: string,
    tenantId: string,
    set: Partial<typeof memberships.$inferInsert>,
  ) =>
    t.db
      .update(memberships)
      .set(set)
      .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)));

  it("takes the role from the membership record, ignoring the token's claim", async () => {
    const { userId, tenantId } = await owner();
    await setMembership(userId, tenantId, { role: "cashier" });
    const res = await guard({ userId, tenantId, role: "owner", sessionId: "s" });
    expect(res.ok).toBe(true);
    expect(res.req.tenantAccess).toMatchObject({ tenantId, role: "cashier", userId });
  });

  it("rejects a disabled membership with not_a_member, even with a valid token", async () => {
    const { userId, tenantId } = await owner();
    await setMembership(userId, tenantId, { status: "switched_off" });
    const res = await guard({ userId, tenantId, role: "owner", sessionId: "s" });
    expect(res).toMatchObject({ ok: false, code: "not_a_member" });
  });

  it("rejects a business id the user never belonged to, and a disabled business", async () => {
    const a = await owner();
    const b = await owner();
    expect(
      await guard({ ...a, tenantId: b.tenantId, role: "owner", sessionId: "s" }),
    ).toMatchObject({ ok: false, code: "not_a_member" });
    await t.db.update(tenants).set({ status: "disabled" }).where(eq(tenants.id, a.tenantId));
    expect(await guard({ ...a, role: "owner", sessionId: "s" })).toMatchObject({
      ok: false,
      code: "not_a_member",
    });
  });

  it("caches answers for a few seconds only", async () => {
    const { userId, tenantId } = await owner();
    const access = t.app.get(TenantAccess);
    const now = Date.now();
    expect(await access.roleOf(userId, tenantId, now)).toBe("owner");
    await setMembership(userId, tenantId, { status: "switched_off" });
    expect(await access.roleOf(userId, tenantId, now + 1)).toBe("owner");
    expect(await access.roleOf(userId, tenantId, now + TENANT_ACCESS_CACHE_MS + 1)).toBeNull();
  });

  it("IdentityService.revokeAllSessions signs the user out on every device", async () => {
    const phoneClient = new TestClient(t.app);
    const { request, response } = await registerOwner(phoneClient);
    const laptop = new TestClient(t.app);
    await laptop.post("/auth/login", { identifier: request.phone, password: request.password });
    const bystander = new TestClient(t.app);
    await registerOwner(bystander);

    await t.app
      .get(IdentityService)
      .revokeAllSessions(response.user.id, "membership_disabled", response.activeTenantId!);

    for (const client of [phoneClient, laptop]) {
      expect((await client.get("/auth/me")).json().error.code).toBe("session_expired");
      expect((await client.post("/auth/refresh")).statusCode).toBe(401);
    }
    expect((await bystander.get("/auth/me")).statusCode).toBe(200);
    const [entry] = await t.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "sessions_revoked"));
    expect(entry).toMatchObject({ reason: "membership_disabled", outcome: "success" });
  });
});
