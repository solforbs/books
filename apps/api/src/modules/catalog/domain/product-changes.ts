import type { ProductDraft } from "./product-draft";

/** Fields whose change is written to the history, in the order they are reported. */
export const TRACKED_FIELDS = [
  "name",
  "categoryId",
  "brand",
  "model",
  "storage",
  "colour",
  "condition",
  "trackingType",
  "baseUnit",
  "retailPrice",
  "wholesalePrice",
  "minPrice",
  "vatType",
  "canBeGivenFree",
  "warrantyMonths",
] as const satisfies readonly (keyof ProductDraft)[];
export type TrackedField = (typeof TRACKED_FIELDS)[number];

/** Changing these needs `set_prices` (F01 §11); also their history is visible only to price setters. */
export const PRICE_FIELDS: readonly string[] = [
  "retailPrice",
  "wholesalePrice",
  "minPrice",
  "locationPrices",
  "packPrices",
];

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Which tracked fields differ between two versions of a product. */
export function diffDrafts(before: ProductDraft, after: ProductDraft): FieldChange[] {
  return TRACKED_FIELDS.filter((f) => before[f] !== after[f]).map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }));
}

export interface PriceInputs {
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  minPrice?: number | null;
  locationPrices?: { retailPrice?: number | null; wholesalePrice?: number | null }[];
  packUnits?: { retailPrice?: number | null; wholesalePrice?: number | null }[];
}

/**
 * Whether a request tries to set prices. On create, `null` and `undefined` both mean "no
 * price" and do not count; on update `null` clears a price, which does count (`clearing`).
 */
export function touchesPrices(input: PriceInputs, clearing: boolean): boolean {
  const set = (v: number | null | undefined) => (clearing ? v !== undefined : v != null);
  const rows = [...(input.locationPrices ?? []), ...(input.packUnits ?? [])];
  return (
    set(input.retailPrice) ||
    set(input.wholesalePrice) ||
    set(input.minPrice) ||
    (clearing && input.locationPrices !== undefined) ||
    rows.some((r) => r.retailPrice != null || r.wholesalePrice != null)
  );
}
