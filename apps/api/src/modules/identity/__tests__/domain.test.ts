import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError } from "../../../common/errors/app-error";
import { maskIdentifier } from "../../../common/security/mask";
import { RequireTenantGuard } from "../api/require-tenant.guard";
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

  it("maskIdentifier hides the middle of phones and the local part of emails", () => {
    expect(maskIdentifier("+254712345678")).toBe("+254712***678");
    expect(maskIdentifier("jane@example.com")).toBe("j***@example.com");
  });
});

describe("RequireTenantGuard", () => {
  const ctx = (auth?: Partial<AuthContext>) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ auth }) }),
    }) as unknown as ExecutionContext;
  const guard = new RequireTenantGuard();
  const codeOf = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return (e as AppError).code;
    }
    return null;
  };

  it("lets a session with an active business through", () => {
    expect(guard.canActivate(ctx({ userId: "u", tenantId: "t", sessionId: "s" }))).toBe(true);
  });

  it("returns business_not_selected when no business is active", () => {
    expect(codeOf(() => guard.canActivate(ctx({ userId: "u", tenantId: null })))).toBe(
      "business_not_selected",
    );
  });

  it("returns not_authenticated without a session", () => {
    expect(codeOf(() => guard.canActivate(ctx()))).toBe("not_authenticated");
  });
});
