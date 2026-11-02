import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionResponse } from "@books/shared";
import { PASSWORD, registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { memberships } from "../infrastructure/tables/memberships.table";

describe("multi-business users and POST /auth/select-business", () => {
  let t: TestApp;
  let phone: string;
  let shopA: string;
  let shopB: string;
  let strangerShop: string;

  beforeAll(async () => {
    t = await createTestApp();
    const a = await registerOwner(new TestClient(t.app), { businessName: "Shop Alpha" });
    const b = await registerOwner(new TestClient(t.app), { businessName: "Shop Beta" });
    const c = await registerOwner(new TestClient(t.app), { businessName: "Shop Gamma" });
    phone = a.request.phone!;
    shopA = a.response.activeTenantId!;
    shopB = b.response.activeTenantId!;
    strangerShop = c.response.activeTenantId!;
    // The owner of Alpha is also a manager at Beta (staff invites arrive in F02).
    await t.db.insert(memberships).values({
      userId: a.response.user.id,
      tenantId: shopB,
      role: "manager",
      status: "active",
    });
  });
  afterAll(() => t.close());

  async function loginMulti(): Promise<{ client: TestClient; body: SessionResponse }> {
    const client = new TestClient(t.app);
    const res = await client.post("/auth/login", { identifier: phone, password: PASSWORD });
    expect(res.statusCode).toBe(200);
    return { client, body: res.json<SessionResponse>() };
  }

  it("does not pick a business automatically when the user has several", async () => {
    const { client, body } = await loginMulti();
    expect(body.activeTenantId).toBeNull();
    expect(body.memberships).toEqual([
      { tenantId: shopA, businessName: "Shop Alpha", role: "owner" },
      { tenantId: shopB, businessName: "Shop Beta", role: "manager" },
    ]);
    expect((await client.get("/auth/me")).json().activeTenantId).toBeNull();
  });

  it("selects a business the user belongs to; the choice survives refresh", async () => {
    const { client } = await loginMulti();
    const res = await client.post("/auth/select-business", { tenantId: shopB });
    expect(res.statusCode).toBe(200);
    expect(res.json().activeTenantId).toBe(shopB);
    expect(res.cookies.map((c) => c.name)).toEqual(["books_at"]);

    expect((await client.get("/auth/me")).json().activeTenantId).toBe(shopB);
    expect((await client.post("/auth/refresh")).json().activeTenantId).toBe(shopB);
    expect((await client.get("/auth/me")).json().activeTenantId).toBe(shopB);

    const switched = await client.post("/auth/select-business", { tenantId: shopA });
    expect(switched.json().activeTenantId).toBe(shopA);
  });

  it("refuses a business the user is not a member of", async () => {
    const { client } = await loginMulti();
    for (const tenantId of [strangerShop, randomUUID(), "not-an-id"]) {
      const res = await client.post("/auth/select-business", { tenantId });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("not_a_member");
    }
    expect((await client.get("/auth/me")).json().activeTenantId).toBeNull();
  });

  it("refuses a disabled membership", async () => {
    const { client } = await loginMulti();
    const managerAtB = and(eq(memberships.tenantId, shopB), eq(memberships.role, "manager"));
    await t.db.update(memberships).set({ status: "switched_off" }).where(managerAtB);
    try {
      const res = await client.post("/auth/select-business", { tenantId: shopB });
      expect(res.json().error.code).toBe("not_a_member");
    } finally {
      await t.db.update(memberships).set({ status: "active" }).where(managerAtB);
    }
  });

  it("requires a session", async () => {
    const res = await new TestClient(t.app).post("/auth/select-business", { tenantId: shopA });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("not_authenticated");
  });
});
