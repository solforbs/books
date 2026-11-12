import { describe, expect, it } from "vitest";
import { canShareManufacturerBarcode, checkBarcodeValue } from "../domain/barcode-rules";
import { canonicalCondition, draftFromCreate, withKeys } from "../domain/product-draft";
import {
  areNamesSimilar,
  isSimilar,
  nameTokens,
  type SimilarityCandidate,
} from "../domain/similarity";

const parts = (
  id: string,
  brand: string,
  model: string,
  over: Partial<SimilarityCandidate> = {},
): SimilarityCandidate => ({
  id,
  name: `${brand} ${model}`,
  namingMode: "parts",
  brand,
  model,
  storage: "128GB",
  colour: "Black",
  condition: "New",
  ...over,
});

describe("similar names (F01 §9)", () => {
  it("treats Type-C and USB C spellings of the same thing as one word", () => {
    expect(nameTokens("Type-C cable 1m")).toEqual(["typec", "cable", "1m"]);
    expect(nameTokens("USB C cable 1 m")).toEqual(["typec", "cable", "1m"]);
    expect(nameTokens("USB-C Cable 1M")).toEqual(["typec", "cable", "1m"]);
    expect(nameTokens("usb type c cable 1m")).toEqual(["typec", "cable", "1m"]);
  });

  it("flags Type-C cable 1m against USB C cable 1m", () => {
    expect(areNamesSimilar("USB C cable 1m", "Type-C cable 1m")).toBe(true);
  });

  it("flags names that share most words", () => {
    expect(areNamesSimilar("Oraimo 20W charger", "Oraimo charger 20W")).toBe(true);
    expect(areNamesSimilar("Phone case generic", "Generic phone case")).toBe(true);
  });

  it("does not flag a different specification (a word with a digit differs)", () => {
    expect(areNamesSimilar("Oraimo 20W charger", "Oraimo 33W charger")).toBe(false);
    expect(areNamesSimilar("USB C cable 1m", "USB C cable 2m")).toBe(false);
  });

  it("does not flag unrelated or barely overlapping names", () => {
    expect(areNamesSimilar("Type-C cable 1m", "Phone case")).toBe(false);
    expect(areNamesSimilar("Charger", "Fast charger")).toBe(false);
    expect(areNamesSimilar("", "Charger")).toBe(false);
  });
});

describe("similar phones and laptops (parts products)", () => {
  it("flags A15 against Galaxy A15 with the same storage, colour and condition", () => {
    expect(isSimilar(parts("1", "Samsung", "A15"), parts("2", "Samsung", "Galaxy A15"))).toBe(true);
    expect(
      isSimilar(parts("1", "Apple", "iPhone 13 Pro"), parts("2", "Apple", "Apple iPhone 13 Pro")),
    ).toBe(true);
  });

  it("never flags the siblings of one model (other colour or storage)", () => {
    const base = parts("1", "Apple", "iPhone 13 Pro");
    expect(isSimilar(base, parts("2", "Apple", "iPhone 13 Pro", { colour: "Gold" }))).toBe(false);
    expect(isSimilar(base, parts("3", "Apple", "iPhone 13 Pro", { storage: "256GB" }))).toBe(false);
  });

  it("does not flag different models, other brands or other variants", () => {
    expect(isSimilar(parts("1", "Apple", "iPhone 13"), parts("2", "Apple", "iPhone 13 Pro"))).toBe(
      false,
    );
    expect(isSimilar(parts("1", "Samsung", "A15"), parts("2", "Tecno", "Galaxy A15"))).toBe(false);
    expect(
      isSimilar(
        parts("1", "Samsung", "A15"),
        parts("2", "Samsung", "Galaxy A15", { storage: "64GB" }),
      ),
    ).toBe(false);
  });

  it("is never similar to itself", () => {
    expect(isSimilar(parts("1", "Samsung", "A15"), parts("1", "Samsung", "Galaxy A15"))).toBe(
      false,
    );
  });
});

describe("keys, names and barcodes", () => {
  const phones = { id: "c", namingMode: "parts", defaultTracking: "imei" } as const;

  it("builds the name of a phone from its parts and cleans the typing", () => {
    const draft = draftFromCreate(
      phones,
      {
        brand: " Apple ",
        model: "iPhone   13 pro",
        storage: "128GB",
        colour: "blue",
        condition: "new",
        baseUnit: "piece",
        canBeGivenFree: false,
      },
      false,
    );
    expect(draft.name).toBe("Apple iPhone 13 pro 128GB blue New");
    expect(draft.trackingType).toBe("imei");
    expect(draft.modelGroupKey).toBe("apple|iphone13pro|||");
  });

  it("refuses a phone without brand, model or condition", () => {
    const base = { baseUnit: "piece", canBeGivenFree: false, brand: "Apple", model: "X" };
    expect(() => draftFromCreate(phones, base, false)).toThrow(/Request validation failed/);
  });

  it("ignores the VAT type unless the business charges VAT (G3)", () => {
    const category = { id: "c", namingMode: "free", defaultTracking: "quantity" } as const;
    const input = {
      name: "Cable",
      baseUnit: "piece",
      canBeGivenFree: false,
      vatType: "standard",
    } as const;
    expect(draftFromCreate(category, input, false).vatType).toBeNull();
    expect(draftFromCreate(category, input, true).vatType).toBe("standard");
  });

  it("keys typed names by their cleaned text", () => {
    const a = withKeys("free", { ...base("Type-C  Cable 1m") });
    const b = withKeys("free", { ...base("type-c cable 1M") });
    expect(a.duplicateKey).toBe(b.duplicateKey);
  });

  it("maps typed conditions to the starter spelling", () => {
    expect(canonicalCondition("ex uk")).toBe("Ex-UK");
    expect(canonicalCondition("NEW")).toBe("New");
    expect(canonicalCondition("Grade A")).toBe("Grade A");
  });

  it("accepts real product and shop labels, refuses odd characters, short, long codes and IMEIs", () => {
    // Scanner spaces are removed; EAN-13, EAN-8, UPC-A and ITF-14 are plain digits.
    expect(checkBarcodeValue(" 6901 2345 67892 ")).toEqual({ ok: true, value: "6901234567892" });
    for (const label of [
      "96385074",
      "036000291452",
      "10012345678902",
      "AB-1234",
      "A12/5",
      "ab.9",
    ]) {
      expect(checkBarcodeValue(label), label).toEqual({ ok: true, value: label.toUpperCase() });
    }
    expect(checkBarcodeValue("69-01")).toEqual({ ok: true, value: "69-01" });
    expect(checkBarcodeValue("A".repeat(43))).toMatchObject({ ok: true });
    for (const bad of ["12", "A".repeat(44), "abc!", "a_b-c", "50%off", ""]) {
      expect(checkBarcodeValue(bad), bad).toMatchObject({ ok: false });
    }
    expect(checkBarcodeValue("490154203237518")).toEqual({ ok: false, reason: "imei" });
  });

  it("lets a manufacturer barcode be shared only by products that differ in condition alone", () => {
    const family = "apple|iphone13pro|128gb|blue";
    const one = { conditionFamilyKey: family, condition: "New" };
    expect(
      canShareManufacturerBarcode(one, { conditionFamilyKey: family, condition: "Ex-UK" }),
    ).toBe(true);
    expect(canShareManufacturerBarcode(one, { conditionFamilyKey: family, condition: "new" })).toBe(
      false,
    );
    expect(
      canShareManufacturerBarcode(one, {
        conditionFamilyKey: "apple|iphone13pro|128gb|gold",
        condition: "Used",
      }),
    ).toBe(false);
    expect(
      canShareManufacturerBarcode(
        { conditionFamilyKey: null, condition: null },
        { conditionFamilyKey: null, condition: null },
      ),
    ).toBe(false);
  });
});

function base(name: string) {
  return {
    name,
    categoryId: "c",
    brand: null,
    model: null,
    storage: null,
    colour: null,
    condition: null,
    trackingType: "quantity" as const,
    baseUnit: "piece",
    retailPrice: null,
    wholesalePrice: null,
    minPrice: null,
    vatType: null,
    canBeGivenFree: false,
    warrantyMonths: null,
  };
}
