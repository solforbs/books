import { describe, expect, it } from "vitest";
import { checkPassword } from "@books/shared";
import { maskDetails } from "../../audit/application/audit.service";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { generateTemporaryPassword } from "../../identity/domain/temporary-password";
import { StaffErrors } from "../domain/staff-errors";
import { assertNotSelf, canManagePerson, removesOwner } from "../domain/staff-policy";

const access = (over: Partial<TenantAccessContext> = {}): TenantAccessContext => ({
  tenantId: "t",
  userId: "me",
  membershipId: "m",
  role: "manager",
  permissionOverrides: { add_staff: true },
  locationIds: ["shop1", "shop2"],
  ...over,
});

describe("staff rules (pure)", () => {
  it("add_staff covers cashiers and storekeepers at the manager's own locations only", () => {
    expect(canManagePerson(access(), "cashier", ["shop1"])).toBe(true);
    expect(canManagePerson(access(), "storekeeper", ["shop1", "shop2"])).toBe(true);
    expect(canManagePerson(access(), "manager", ["shop1"])).toBe(false);
    expect(canManagePerson(access(), "cashier", ["shop3"])).toBe(false);
    expect(canManagePerson(access(), "cashier", [])).toBe(false);
    expect(canManagePerson(access({ permissionOverrides: {} }), "cashier", ["shop1"])).toBe(false);
    expect(canManagePerson(access({ role: "owner", locationIds: [] }), "owner", [])).toBe(true);
  });

  it("knows when a change removes an active owner", () => {
    const owner = { role: "owner" as const, status: "active" as const };
    expect(removesOwner(owner, { role: "manager" })).toBe(true);
    expect(removesOwner(owner, { status: "switched_off" })).toBe(true);
    expect(removesOwner(owner, { role: "owner" })).toBe(false);
    expect(removesOwner({ ...owner, role: "cashier" }, { status: "switched_off" })).toBe(false);
  });

  it("self changes: last_owner for the last owner stepping down, else cannot_change_self", () => {
    const me = { userId: "me", role: "owner" as const, status: "active" as const };
    const self = access({ role: "owner" });
    expect(() => assertNotSelf(self, me, { status: "switched_off" }, 1)).toThrow(
      expect.objectContaining({ code: "last_owner" }),
    );
    expect(() => assertNotSelf(self, me, { status: "switched_off" }, 2)).toThrow(
      expect.objectContaining({ code: "cannot_change_self" }),
    );
    expect(() => assertNotSelf(self, { ...me, userId: "other" }, {}, 1)).not.toThrow();
    expect(StaffErrors.lastOwner().httpStatus).toBe(409);
  });

  it("temporary passwords pass the shared policy and differ every time", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword(["Brian Otieno", "Brian", "Otieno"]);
      expect(checkPassword(p, ["Brian Otieno"])).toEqual([]);
      seen.add(p);
    }
    expect(seen.size).toBe(200);
  });

  it("audit details never hold full phone numbers or emails", () => {
    expect(
      maskDetails({ after: { phone: "+254712345678", email: "jane@example.com", name: "Jane" } }),
    ).toEqual({ after: { phone: "+254******678", email: "j***@example.com", name: "Jane" } });
  });
});
