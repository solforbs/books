/**
 * Product names and duplicate keys (F01 §6, §9). The app never guesses a name: for
 * "parts" categories (phones, laptops) it only joins what the person picked or typed.
 */

/** Cleans typed text: trims, collapses spaces, keeps the person's capital letters. */
export function cleanText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** For comparing: lower case, no punctuation, single spaces. */
export function normalizeForCompare(input: string): string {
  return cleanText(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ProductParts {
  brand?: string | null;
  model?: string | null;
  storage?: string | null;
  colour?: string | null;
  condition?: string | null;
}

/** "Samsung A15 128GB Black New": brand, model, storage, colour, condition. */
export function buildProductName(parts: ProductParts): string {
  return [parts.brand, parts.model, parts.storage, parts.colour, parts.condition]
    .map((p) => cleanText(p ?? ""))
    .filter(Boolean)
    .join(" ");
}

/** Two products with the same key are exact duplicates (same parts after cleaning). */
export function productDuplicateKey(parts: ProductParts): string {
  return [parts.brand, parts.model, parts.storage, parts.colour, parts.condition]
    .map((p) => normalizeForCompare(p ?? "").replace(/\s/g, ""))
    .join("|");
}

/** Same brand, model, storage and colour: products that may differ only in condition. */
export function conditionFamilyKey(parts: ProductParts): string {
  return productDuplicateKey({ ...parts, condition: null });
}

/** The group "all iPhone 13 Pro" (brand + model) used in search and reports. */
export function modelGroupKey(parts: ProductParts): string {
  return productDuplicateKey({ brand: parts.brand, model: parts.model });
}
