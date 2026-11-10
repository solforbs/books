import {
  STARTER_CONDITIONS,
  buildProductName,
  cleanText,
  conditionFamilyKey,
  modelGroupKey,
  normalizeForCompare,
  productDuplicateKey,
  type NAMING_MODES,
  type TrackingType,
  type VAT_TYPES,
} from "@books/shared";
import { CatalogErrors } from "./catalog-errors";

export type NamingMode = (typeof NAMING_MODES)[number];

/** The editable facts of a product, already cleaned, with its name and comparison keys. */
export interface ProductDraft {
  name: string;
  nameKey: string;
  categoryId: string;
  brand: string | null;
  model: string | null;
  storage: string | null;
  colour: string | null;
  condition: string | null;
  trackingType: TrackingType;
  baseUnit: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  minPrice: number | null;
  vatType: (typeof VAT_TYPES)[number] | null;
  canBeGivenFree: boolean;
  warrantyMonths: number | null;
  duplicateKey: string;
  conditionFamilyKey: string | null;
  modelGroupKey: string | null;
}

export type DraftFields = Omit<
  ProductDraft,
  "nameKey" | "duplicateKey" | "conditionFamilyKey" | "modelGroupKey"
>;

/** Cleans optional typed text; empty becomes null. */
export function cleanOptional(value: string | null | undefined): string | null {
  const cleaned = cleanText(value ?? "");
  return cleaned === "" ? null : cleaned;
}

/** "new" or "ex uk" typed by hand become the starter spelling ("New", "Ex-UK"). */
export function canonicalCondition(value: string | null): string | null {
  if (!value) return null;
  const key = normalizeForCompare(value);
  return STARTER_CONDITIONS.find((c) => normalizeForCompare(c) === key) ?? value;
}

/** For "parts" categories all five parts are required (F01 §4); returns what is missing. */
export function missingPartsFields(
  mode: NamingMode,
  parts: Record<"brand" | "model" | "storage" | "colour" | "condition", string | null>,
): string[] {
  if (mode !== "parts") return [];
  return (["brand", "model", "storage", "colour", "condition"] as const).filter((f) => !parts[f]);
}

/**
 * Adds the comparison keys. "parts" products are identical when brand+model+storage+colour
 * +condition match after cleaning (F01 §9); typed-name products when their names do.
 */
export function withKeys(mode: NamingMode, fields: DraftFields): ProductDraft {
  const nameKey = normalizeForCompare(fields.name);
  const duplicateKey =
    mode === "parts" ? productDuplicateKey(fields) : `n:${nameKey.replace(/\s/g, "")}`;
  return {
    ...fields,
    nameKey,
    duplicateKey,
    conditionFamilyKey: fields.model ? conditionFamilyKey(fields) : null,
    modelGroupKey: fields.brand || fields.model ? modelGroupKey(fields) : null,
  };
}

/** The name to save: built from the parts for "parts" categories, otherwise what was typed. */
export function nameFor(mode: NamingMode, typed: string | null | undefined, parts: object): string {
  if (mode === "parts") return buildProductName(parts);
  return cleanText(typed ?? "");
}

/** What a category contributes to a new product. */
export interface CategoryRules {
  id: string;
  namingMode: NamingMode;
  defaultTracking: TrackingType;
}

export interface CreateFields {
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  storage?: string | null;
  colour?: string | null;
  condition?: string | null;
  trackingType?: TrackingType;
  baseUnit: string;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  minPrice?: number | null;
  vatType?: (typeof VAT_TYPES)[number] | null;
  canBeGivenFree: boolean;
  warrantyMonths?: number | null;
}

/**
 * The cleaned product a create request describes. Typed text is cleaned (F01 §6), "parts"
 * categories build the name and need all five parts (F01 §4), and the VAT type
 * is kept only when the business charges VAT (G3).
 */
export function draftFromCreate(
  category: CategoryRules,
  input: CreateFields,
  vatEnabled: boolean,
): ProductDraft {
  const parts = {
    brand: cleanOptional(input.brand),
    model: cleanOptional(input.model),
    storage: cleanOptional(input.storage),
    colour: cleanOptional(input.colour),
    condition: canonicalCondition(cleanOptional(input.condition)),
  };
  const missing = missingPartsFields(category.namingMode, parts)[0];
  if (missing) throw CatalogErrors.fieldRequired(missing);
  const name = nameFor(category.namingMode, input.name, parts);
  if (!name) throw CatalogErrors.fieldRequired("name");
  return withKeys(category.namingMode, {
    ...parts,
    name,
    categoryId: category.id,
    trackingType: input.trackingType ?? category.defaultTracking,
    baseUnit: cleanText(input.baseUnit),
    retailPrice: input.retailPrice ?? null,
    wholesalePrice: input.wholesalePrice ?? null,
    minPrice: input.minPrice ?? null,
    vatType: vatEnabled ? (input.vatType ?? null) : null,
    canBeGivenFree: input.canBeGivenFree,
    warrantyMonths: input.warrantyMonths ?? null,
  });
}

/** The editable facts of a stored product, as a draft input (keys are recomputed by `withKeys`). */
export function fieldsOf(row: DraftFields): DraftFields {
  return {
    name: row.name,
    categoryId: row.categoryId,
    brand: row.brand,
    model: row.model,
    storage: row.storage,
    colour: row.colour,
    condition: row.condition,
    trackingType: row.trackingType,
    baseUnit: row.baseUnit,
    retailPrice: row.retailPrice,
    wholesalePrice: row.wholesalePrice,
    minPrice: row.minPrice,
    vatType: row.vatType,
    canBeGivenFree: row.canBeGivenFree,
    warrantyMonths: row.warrantyMonths,
  };
}
