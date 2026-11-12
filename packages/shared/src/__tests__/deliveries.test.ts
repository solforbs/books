import { describe, expect, it } from "vitest";
import {
  completeUnitsRequestSchema,
  createDeliveryRequestSchema,
  effectivePermissions,
  enterCostsRequestSchema,
  stockRowSchema,
} from "../index";

const line = { productId: "p1", quantity: 5, lineTotalCents: 225_000 };
const base = { commandId: "cmd-12345678", supplierId: "s1", locationId: "l1", lines: [line] };

describe("create delivery request (F04a)", () => {
  it("accepts a plain credit delivery with defaults", () => {
    const r = createDeliveryRequestSchema.parse(base);
    expect(r.payments).toEqual([]);
    expect(r.allowIncomplete).toBe(false);
    expect(r.confirmSoldBefore).toBe(false);
    expect(r.lines[0]?.units).toEqual([]);
  });
  it("needs a command id, a supplier, a location and at least one line", () => {
    expect(createDeliveryRequestSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
    expect(createDeliveryRequestSchema.safeParse({ ...base, commandId: "x" }).success).toBe(false);
    const { supplierId, ...noSupplier } = base;
    expect(supplierId).toBe("s1");
    expect(createDeliveryRequestSchema.safeParse(noSupplier).success).toBe(false);
  });
  it("a line without a total is price pending; quantities and money are whole numbers", () => {
    const pending = { productId: "p1", quantity: 3 };
    expect(createDeliveryRequestSchema.safeParse({ ...base, lines: [pending] }).success).toBe(true);
    expect(
      createDeliveryRequestSchema.safeParse({ ...base, lines: [{ ...line, quantity: 0 }] }).success,
    ).toBe(false);
    expect(
      createDeliveryRequestSchema.safeParse({ ...base, lines: [{ ...line, quantity: 1.5 }] })
        .success,
    ).toBe(false);
    expect(
      createDeliveryRequestSchema.safeParse({ ...base, lines: [{ ...line, lineTotalCents: 10.5 }] })
        .success,
    ).toBe(false);
  });
  it("carries units for IMEI products and a payment rule for this delivery only", () => {
    const r = createDeliveryRequestSchema.parse({
      ...base,
      paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
      payments: [{ moneyPlaceId: "m1", amountCents: 100_000 }],
      lines: [{ ...line, units: [{ imei: "490154203237518", imei2: "490154203237526" }] }],
    });
    expect(r.paymentRule?.type).toBe("within_time");
    expect(r.lines[0]?.units).toHaveLength(1);
  });
  it("refuses a zero payment", () => {
    expect(
      createDeliveryRequestSchema.safeParse({
        ...base,
        payments: [{ moneyPlaceId: "m1", amountCents: 0 }],
      }).success,
    ).toBe(false);
  });
});

describe("other receiving requests", () => {
  it("entering costs needs lines with totals", () => {
    expect(
      enterCostsRequestSchema.safeParse({ commandId: "cmd-12345678", lines: [] }).success,
    ).toBe(false);
    expect(
      enterCostsRequestSchema.safeParse({
        commandId: "cmd-12345678",
        lines: [{ lineId: "a", lineTotalCents: 100 }],
      }).success,
    ).toBe(true);
  });
  it("completing units needs the line of each unit", () => {
    const ok = { commandId: "cmd-12345678", units: [{ lineId: "a", imei: "490154203237518" }] };
    expect(completeUnitsRequestSchema.safeParse(ok).success).toBe(true);
    expect(completeUnitsRequestSchema.safeParse({ ...ok, units: [{ imei: "1" }] }).success).toBe(
      false,
    );
  });
});

describe("stock rows and the pay_suppliers permission", () => {
  it("a stock row hides value for people without cost access (null)", () => {
    const row = {
      productId: "p",
      productName: "Charger",
      categoryId: "c",
      trackingType: "quantity",
      locationId: "l",
      locationName: "Shop",
      onHand: 5,
      incomplete: 0,
      costMissing: 0,
      valueCents: null,
    };
    expect(stockRowSchema.safeParse(row).success).toBe(true);
  });
  it("owners and managers can pay suppliers by default; cashiers and storekeepers cannot (F04 §7)", () => {
    expect(effectivePermissions("owner").has("pay_suppliers")).toBe(true);
    expect(effectivePermissions("manager").has("pay_suppliers")).toBe(true);
    expect(effectivePermissions("cashier").has("pay_suppliers")).toBe(false);
    expect(effectivePermissions("storekeeper").has("pay_suppliers")).toBe(false);
    expect(effectivePermissions("storekeeper", { pay_suppliers: true }).has("pay_suppliers")).toBe(
      true,
    );
  });
});
