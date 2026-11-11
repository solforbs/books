import { describe, expect, it } from "vitest";
import { chargersCategory, makeProduct, phonesCategory } from "@/test/catalog-fixtures";
import { moneyToInput, parseMoneyInput } from "../money-input";
import { emptyValues, valuesFromProduct } from "../product-form-values";
import { buildCreateRequest } from "../product-request";
import { buildUpdateRequest } from "../product-update-request";

const ctx = { category: phonesCategory, canSetPrices: true, vatEnabled: false };

describe("money typed in shillings", () => {
  it("turns typed shillings into whole cents and back", () => {
    expect(parseMoneyInput("1,250.50")).toEqual({ ok: true, value: 125050 });
    expect(parseMoneyInput("  ")).toEqual({ ok: true, value: null });
    expect(parseMoneyInput("abc")).toEqual({ ok: false });
    expect(parseMoneyInput("-5")).toEqual({ ok: false });
    expect(moneyToInput(1550000)).toBe("15500");
    expect(moneyToInput(125050)).toBe("1250.50");
    expect(moneyToInput(null)).toBe("");
  });
});

describe("building requests", () => {
  const phone = emptyValues({
    categoryId: "c-phones",
    brand: "  Samsung ",
    model: "A15",
    storage: "128GB",
    colour: "Black",
    condition: "New",
    retail: "15,500",
  });

  it("parts categories send the parts, not a typed name", () => {
    const built = buildCreateRequest(phone, ctx);
    expect(built.ok && built.request).toMatchObject({
      brand: "Samsung",
      retailPrice: 1550000,
      trackingType: "imei",
    });
    expect(built.ok && "name" in built.request).toBe(false);
  });

  it("a person without set_prices sends no prices at all", () => {
    const built = buildCreateRequest({ ...phone, retail: "" }, { ...ctx, canSetPrices: false });
    expect(built.ok && "retailPrice" in built.request).toBe(false);
  });

  it("pack units are dropped for IMEI products and kept for quantity products", () => {
    const packs = [{ name: "Box", size: "10", wholesale: "", retail: "" }];
    const imei = buildCreateRequest({ ...phone, packs }, ctx);
    expect(imei.ok && imei.request.packUnits).toEqual([]);
    const charger = buildCreateRequest(
      emptyValues({ categoryId: "c-chargers", name: "Oraimo 20W", retail: "1000", packs }),
      { ...ctx, category: chargersCategory },
    );
    expect(charger.ok && charger.request.packUnits).toEqual([{ name: "Box", size: 10 }]);
  });

  it("VAT type is sent only when the business charges VAT", () => {
    const off = buildCreateRequest(phone, ctx);
    expect(off.ok && "vatType" in off.request).toBe(false);
    const on = buildCreateRequest(phone, { ...ctx, vatEnabled: true });
    expect(on.ok && on.request.vatType).toBe("standard");
  });

  it("update sends only the fields that changed", () => {
    const product = makeProduct();
    const initial = valuesFromProduct(product, { withPrices: true });
    const changed = { ...initial, retail: "16000" };
    const built = buildUpdateRequest(changed, initial, ctx);
    expect(built.ok && built.request).toEqual({ retailPrice: 1600000 });
    const same = buildUpdateRequest(initial, initial, ctx);
    expect(same.ok).toBe(false);
  });

  it("update leaves prices alone for someone who may not set them", () => {
    const initial = valuesFromProduct(makeProduct(), { withPrices: false });
    const built = buildUpdateRequest({ ...initial, colour: "Blue" }, initial, {
      ...ctx,
      canSetPrices: false,
    });
    expect(built.ok && built.request).toEqual({
      colour: "Blue",
      name: "Samsung A15 128GB Blue New",
    });
  });
});
