import { describe, expect, it } from "vitest";
import {
  createLocationRequestSchema,
  createMoneyPlaceRequestSchema,
  createStaffRequestSchema,
  effectivePermissions,
  isApprover,
  updateBusinessRequestSchema,
} from "../index";

describe("permissions (F02 §4.2)", () => {
  it("owners always have everything, even with switches off", () => {
    expect(effectivePermissions("owner", { sell: false }).has("sell")).toBe(true);
  });
  it("role defaults apply and per-person switches override them", () => {
    expect(effectivePermissions("cashier").has("sell")).toBe(true);
    expect(effectivePermissions("cashier").has("see_cost_profit")).toBe(false);
    expect(effectivePermissions("cashier", { give_discounts: false }).has("give_discounts")).toBe(
      false,
    );
    expect(effectivePermissions("manager", { add_staff: true }).has("add_staff")).toBe(true);
  });
  it("managers approve by default; cashiers do not (G1)", () => {
    expect(isApprover("manager")).toBe(true);
    expect(isApprover("manager", { approve_items: false })).toBe(false);
    expect(isApprover("cashier")).toBe(false);
  });
});

describe("business contract", () => {
  it("KRA PIN is optional and checked when given (G3)", () => {
    const base = { name: "Luthuli Phones", vatEnabled: false };
    expect(updateBusinessRequestSchema.parse({ ...base, kraPin: "" }).kraPin).toBeNull();
    expect(updateBusinessRequestSchema.parse({ ...base, kraPin: "a123456789b" }).kraPin).toBe(
      "A123456789B",
    );
    expect(updateBusinessRequestSchema.safeParse({ ...base, kraPin: "123" }).success).toBe(false);
  });
});

describe("locations contract", () => {
  it("requires a type and a name", () => {
    expect(createLocationRequestSchema.safeParse({ name: "Shop 1" }).success).toBe(false);
    expect(createLocationRequestSchema.parse({ name: "Shop 1", type: "shop" }).priceList).toBe(
      "retail",
    );
  });
  it("cash drawers cannot be created by hand; places need a location", () => {
    const ok = { type: "mpesa_till", name: "Till", locationIds: ["l1"] };
    expect(createMoneyPlaceRequestSchema.safeParse(ok).success).toBe(true);
    expect(createMoneyPlaceRequestSchema.safeParse({ ...ok, type: "cash_drawer" }).success).toBe(
      false,
    );
    expect(createMoneyPlaceRequestSchema.safeParse({ ...ok, locationIds: [] }).success).toBe(false);
  });
});

describe("staff contract", () => {
  it("non-owners need a location; phone or email required", () => {
    const base = { name: "Brian", phone: "0712345679", role: "cashier" };
    expect(createStaffRequestSchema.safeParse(base).success).toBe(false);
    expect(createStaffRequestSchema.safeParse({ ...base, locationIds: ["l1"] }).success).toBe(true);
    expect(createStaffRequestSchema.safeParse({ name: "Brian", role: "owner" }).success).toBe(
      false,
    );
  });
});
