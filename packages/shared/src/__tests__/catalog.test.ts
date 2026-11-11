import { describe, expect, it } from "vitest";
import {
  PRODUCT_ERROR_CODES,
  addBarcodeRequestSchema,
  approveProductRequestSchema,
  bulkCreateRequestSchema,
  buildProductName,
  conditionFamilyKey,
  createCategoryRequestSchema,
  createProductRequestSchema,
  effectivePermissions,
  ean13CheckDigit,
  isShopBarcode,
  isValidEan13,
  modelGroupKey,
  productDuplicateKey,
  shopBarcodeFromSequence,
} from "../index";

describe("barcodes (F01 §7)", () => {
  it("computes the EAN-13 check digit", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(isValidEan13("4006381333931")).toBe(true);
    expect(isValidEan13("4006381333932")).toBe(false);
  });
  it("builds unique, valid shop barcodes in the 20 range from a sequence", () => {
    const a = shopBarcodeFromSequence(1);
    const b = shopBarcodeFromSequence(2);
    expect(a).toHaveLength(13);
    expect(a.startsWith("20")).toBe(true);
    expect(isShopBarcode(a) && isShopBarcode(b)).toBe(true);
    expect(a).not.toBe(b);
    expect(() => shopBarcodeFromSequence(0)).toThrow();
  });
});

describe("names and duplicate keys (F01 §6, §9)", () => {
  const parts = {
    brand: "Samsung",
    model: "A15",
    storage: "128GB",
    colour: "Black",
    condition: "New",
  };
  it("joins the parts into the name, skipping empty ones", () => {
    expect(buildProductName(parts)).toBe("Samsung A15 128GB Black New");
    expect(buildProductName({ brand: "Oraimo", model: "20W Charger" })).toBe("Oraimo 20W Charger");
  });
  it("treats spacing and capitals as the same product (T2)", () => {
    const messy = {
      brand: " samsung",
      model: "a15 ",
      storage: "128 gb",
      colour: "BLACK",
      condition: "new",
    };
    expect(productDuplicateKey(messy)).toBe(productDuplicateKey(parts));
  });
  it("condition family and model group keys", () => {
    expect(conditionFamilyKey(parts)).toBe(conditionFamilyKey({ ...parts, condition: "Ex-UK" }));
    expect(productDuplicateKey(parts)).not.toBe(
      productDuplicateKey({ ...parts, condition: "Ex-UK" }),
    );
    expect(modelGroupKey(parts)).toBe(modelGroupKey({ ...parts, storage: "256GB" }));
  });
});

describe("contracts", () => {
  it("a product needs a name or a model", () => {
    expect(createProductRequestSchema.safeParse({ categoryId: "c1" }).success).toBe(false);
    expect(createProductRequestSchema.safeParse({ categoryId: "c1", name: "Cable" }).success).toBe(
      true,
    );
  });
  it("prices are whole cents", () => {
    expect(
      createProductRequestSchema.safeParse({ categoryId: "c1", name: "X", retailPrice: 10.5 })
        .success,
    ).toBe(false);
  });
  it("categories default to free naming and quantity tracking", () => {
    const c = createCategoryRequestSchema.parse({ name: "Chargers" });
    expect(c.namingMode).toBe("free");
    expect(c.defaultTracking).toBe("quantity");
  });
});

describe("product permissions", () => {
  it("everyone but the accountant may add; managers manage (F01 §11)", () => {
    expect(effectivePermissions("cashier").has("add_products")).toBe(true);
    expect(effectivePermissions("storekeeper").has("add_products")).toBe(true);
    expect(effectivePermissions("accountant").has("add_products")).toBe(false);
    expect(effectivePermissions("manager").has("manage_products")).toBe(true);
    expect(effectivePermissions("cashier").has("manage_products")).toBe(false);
  });
});

describe("S1b review fixes (contracts)", () => {
  const base = { categoryId: "c1", name: "Item" };
  it("approve takes one strict schema: empty is a plain approve, bad or unknown fixes fail", () => {
    expect(approveProductRequestSchema.safeParse({}).success).toBe(true);
    expect(approveProductRequestSchema.safeParse({ name: "Fixed", retailPrice: 100 }).success).toBe(
      true,
    );
    expect(approveProductRequestSchema.safeParse({ name: "Fixed", retailPrice: -5 }).success).toBe(
      false,
    );
    expect(approveProductRequestSchema.safeParse({ nonsense: 1 }).success).toBe(false);
  });
  it("barcodes may be 43 characters, not 44", () => {
    const ok = "1".repeat(43);
    expect(createProductRequestSchema.safeParse({ ...base, barcodes: [ok] }).success).toBe(true);
    expect(createProductRequestSchema.safeParse({ ...base, barcodes: [ok + "1"] }).success).toBe(
      false,
    );
    expect(addBarcodeRequestSchema.safeParse({ value: ok }).success).toBe(true);
    expect(addBarcodeRequestSchema.safeParse({ value: ok + "1" }).success).toBe(false);
  });
  it("a single create accepts only form or quick_add; a bulk row may say anything (server forces bulk)", () => {
    for (const source of ["form", "quick_add"]) {
      expect(createProductRequestSchema.safeParse({ ...base, source }).success).toBe(true);
    }
    for (const source of ["import", "bulk"]) {
      expect(createProductRequestSchema.safeParse({ ...base, source }).success).toBe(false);
    }
    expect(
      bulkCreateRequestSchema.safeParse({ items: [{ ...base, source: "import" }] }).success,
    ).toBe(true);
  });
  it("lists the new stable error codes", () => {
    expect(PRODUCT_ERROR_CODES).toContain("invalid_cursor");
    expect(PRODUCT_ERROR_CODES).toContain("barcode_generation_failed");
  });
});
