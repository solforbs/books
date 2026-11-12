import { describe, expect, it } from "vitest";
import {
  approveSupplierRequestSchema,
  createSupplierRequestSchema,
  effectivePermissions,
  normalizeSupplierPhone,
  paymentRuleSchema,
  quickSupplierRequestSchema,
} from "../index";

describe("supplier phones (suppliers can be abroad)", () => {
  it("normalizes Kenyan numbers and accepts international +numbers", () => {
    expect(normalizeSupplierPhone("0712 345 678")).toBe("+254712345678");
    expect(normalizeSupplierPhone("+971 50 123 4567")).toBe("+971501234567");
    expect(normalizeSupplierPhone("+86 138 0013 8000")).toBe("+8613800138000");
    expect(normalizeSupplierPhone("12345")).toBeNull();
    expect(normalizeSupplierPhone("0097150123")).toBeNull();
    // The trunk 0 after +254 is dropped: one phone, one spelling (unique-phone rule, T8).
    expect(normalizeSupplierPhone("+2540799106855")).toBe("+254799106855");
    expect(normalizeSupplierPhone("+254 0799 106 855")).toBe("+254799106855");
    // Anything starting +254 is Kenyan or refused, never taken as an international number.
    expect(normalizeSupplierPhone("+25471234567")).toBeNull();
    expect(normalizeSupplierPhone("+25400799106855")).toBeNull();
  });
});

describe("payment rules (F03 §4)", () => {
  it("cash and the sell-based rules carry no period", () => {
    for (const type of ["cash", "pay_as_you_sell", "pay_after_all_sold"]) {
      expect(paymentRuleSchema.safeParse({ type }).success).toBe(true);
    }
  });
  it("time-based rules need a period of days, weeks or months", () => {
    for (const type of ["within_time", "after_sold_with_latest_date"]) {
      expect(paymentRuleSchema.safeParse({ type }).success).toBe(false);
      expect(
        paymentRuleSchema.safeParse({ type, period: { value: 3, unit: "months" } }).success,
      ).toBe(true);
      expect(
        paymentRuleSchema.safeParse({ type, period: { value: 0, unit: "days" } }).success,
      ).toBe(false);
      expect(
        paymentRuleSchema.safeParse({ type, period: { value: 2, unit: "years" } }).success,
      ).toBe(false);
    }
  });
  it("an unknown rule is refused", () => {
    expect(paymentRuleSchema.safeParse({ type: "whenever" }).success).toBe(false);
  });
});

describe("supplier requests", () => {
  const base = { name: "Dubai Mobiles", phone: "+971501234567" };
  it("defaults to cash, KES and not a neighbour; KRA PIN is optional (G3)", () => {
    const s = createSupplierRequestSchema.parse(base);
    expect(s.paymentRule).toEqual({ type: "cash" });
    expect(s.currency).toBe("KES");
    expect(s.isNeighbour).toBe(false);
    expect(s.kraPin).toBeUndefined();
  });
  it("needs a name and a phone", () => {
    expect(createSupplierRequestSchema.safeParse({ phone: base.phone }).success).toBe(false);
    expect(createSupplierRequestSchema.safeParse({ name: base.name }).success).toBe(false);
  });
  it("checks the KRA PIN only when given", () => {
    expect(createSupplierRequestSchema.safeParse({ ...base, kraPin: "bad" }).success).toBe(false);
    expect(createSupplierRequestSchema.parse({ ...base, kraPin: "" }).kraPin).toBeNull();
  });
  it("quick add takes a name only; approving needs the phone", () => {
    expect(quickSupplierRequestSchema.safeParse({ name: "Mama Jane" }).success).toBe(true);
    expect(approveSupplierRequestSchema.safeParse({}).success).toBe(false);
    expect(approveSupplierRequestSchema.safeParse({ phone: "0722000111" }).success).toBe(true);
  });
});

describe("supplier permissions", () => {
  it("owners and managers manage suppliers; cashiers and storekeepers do not (F03 §3)", () => {
    expect(effectivePermissions("manager").has("manage_suppliers")).toBe(true);
    expect(effectivePermissions("cashier").has("manage_suppliers")).toBe(false);
    expect(effectivePermissions("storekeeper").has("manage_suppliers")).toBe(false);
  });
});
