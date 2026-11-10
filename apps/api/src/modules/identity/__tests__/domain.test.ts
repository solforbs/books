import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError } from "../../../common/errors/app-error";
import { maskIdentifier } from "../../../common/security/mask";
import { RequireTenantGuard } from "../api/require-tenant.guard";
import type { TenantAccess } from "../application/tenant-access";
import { pickActiveMembership } from "../domain/active-tenant";
import { isLocked } from "../domain/auth-policy";
import type { AuthContext } from "../domain/auth-context";
import { generateRecoveryCodes, normalizeRecoveryCode } from "../domain/recovery-codes";

describe("identity domain rules", () => {
  it("recovery codes: 10 unique, readable, normalisable", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/);
    expect(normalizeRecoveryCode(" ab2c-d3ef ")).toBe("AB2CD3EF");
  });

  it("pickActiveMembership: keeps the preferred, auto-picks a single one, else none", () => {
    const a = { tenantId: "a", role: "owner" as const };
    const b = { tenantId: "b", role: "cashier" as const };
    expect(pickActiveMembership([a], null)).toBe(a);
    expect(pickActiveMembership([a, b], null)).toBeNull();
    expect(pickActiveMembership([a, b], "b")).toBe(b);
    expect(pickActiveMembership([a, b], "gone")).toBeNull();
    expect(pickActiveMembership([], null)).toBeNull();
  });

  it("isLocked compares against now", () => {
    const now = new Date();
    expect(isLocked(null, now)).toBe(false);
    expect(isLocked(new Date(now.getTime() + 1000), now)).toBe(true);
    expect(isLocked(new Date(now.getTime() - 1000), now)).toBe(false);
  });

  it("maskIdentifier keeps only the last 3 phone digits and the email domain", () => {
    expect(maskIdentifier("+254712345678")).toBe("+254******678");
    expect(maskIdentifier("0712 345 678")).toBe("+254******678");
    expect(maskIdentifier("jane@example.com")).toBe("j***@example.com");
  });

  it("maskIdentifier stores anything that is not a phone or email as ***", () => {
    for (const junk of ["0712345", "+2547123456789", "071234567x", "jane@", "@example.com", "ab"]) {
      expect(maskIdentifier(junk), junk).toBe("***");
    }
  });
});

describe("RequireTenantGuard", () => {
  // The database says: user "u" is a cashier in "t" and nothing else.
  const access = {
    accessOf: async (userId: string, tenantId: string) =>
      userId === "u" && tenantId === "t"
        ? {
            tenantId,
            userId,
            membershipId: "m",
            role: "cashier",
            permissionOverrides: {},
            locationIds: ["l"],
          }
        : null,
  } as unknown as TenantAccess;
  const guard = new RequireTenantGuard(access);
  const run = async (auth?: Partial<AuthContext>) => {
    const req: { auth?: Partial<AuthContext>; tenantAccess?: unknown } = { auth };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    try {
      return { ok: await guard.canActivate(ctx), req };
    } catch (e) {
      return { code: (e as AppError).code, req };
    }
  };

  it("lets an active member through, with the role from the database, not the token", async () => {
    const res = await run({ userId: "u", tenantId: "t", role: "owner", sessionId: "s" });
    expect(res.ok).toBe(true);
    expect(res.req.auth?.role).toBe("cashier");
    expect(res.req.tenantAccess).toMatchObject({
      tenantId: "t",
      role: "cashier",
      locationIds: ["l"],
    });
  });

  it("returns not_a_member when the database has no active membership", async () => {
    expect((await run({ userId: "u", tenantId: "other", role: "owner" })).code).toBe(
      "not_a_member",
    );
  });

  it("returns business_not_selected when no business is active", async () => {
    expect((await run({ userId: "u", tenantId: null })).code).toBe("business_not_selected");
  });

  it("returns not_authenticated without a session", async () => {
    expect((await run()).code).toBe("not_authenticated");
  });
});
