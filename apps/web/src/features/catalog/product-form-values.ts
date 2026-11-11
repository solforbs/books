import type { Product, TrackingType } from "@books/shared";
import { moneyToInput } from "./money-input";

export interface PackRow {
  name: string;
  size: string;
  wholesale: string;
  retail: string;
}

export interface LocationPriceRow {
  locationId: string;
  retail: string;
  wholesale: string;
}

/** Everything the add/edit form holds, as the text the person typed (money in shillings). */
export interface ProductFormValues {
  categoryId: string;
  name: string;
  brand: string;
  model: string;
  storage: string;
  colour: string;
  condition: string;
  /** null = follow the category's default. */
  trackingType: TrackingType | null;
  baseUnit: string;
  packs: PackRow[];
  barcodes: string[];
  retail: string;
  wholesale: string;
  minPrice: string;
  locationPrices: LocationPriceRow[];
  vatType: string;
  canBeGivenFree: boolean;
  warrantyMonths: string;
}

export function emptyValues(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    categoryId: "",
    name: "",
    brand: "",
    model: "",
    storage: "",
    colour: "",
    condition: "",
    trackingType: null,
    baseUnit: "piece",
    packs: [],
    barcodes: [],
    retail: "",
    wholesale: "",
    minPrice: "",
    locationPrices: [],
    vatType: "",
    canBeGivenFree: false,
    warrantyMonths: "",
    ...overrides,
  };
}

interface FromProductOptions {
  /** Copy leaves out barcodes (they belong to exactly one product) and any stock-related data. */
  copy?: boolean;
  /** Prices are copied only for people who may set prices. */
  withPrices: boolean;
}

export function valuesFromProduct(
  product: Product,
  { copy = false, withPrices }: FromProductOptions,
): ProductFormValues {
  const prices = withPrices;
  return emptyValues({
    categoryId: product.categoryId,
    name: product.name,
    brand: product.brand ?? "",
    model: product.model ?? "",
    storage: product.storage ?? "",
    colour: product.colour ?? "",
    condition: product.condition ?? "",
    trackingType: product.trackingType,
    baseUnit: product.baseUnit,
    packs: copy
      ? product.packUnits
          .filter((p) => p.active)
          .map((p) => ({
            name: p.name,
            size: String(p.size),
            wholesale: prices ? moneyToInput(p.wholesalePrice) : "",
            retail: prices ? moneyToInput(p.retailPrice) : "",
          }))
      : [],
    retail: prices ? moneyToInput(product.retailPrice) : "",
    wholesale: prices ? moneyToInput(product.wholesalePrice) : "",
    minPrice: prices ? moneyToInput(product.minPrice) : "",
    locationPrices: prices
      ? product.locationPrices.map((l) => ({
          locationId: l.locationId,
          retail: moneyToInput(l.retailPrice),
          wholesale: moneyToInput(l.wholesalePrice),
        }))
      : [],
    vatType: product.vatType ?? "",
    canBeGivenFree: product.canBeGivenFree,
    warrantyMonths: product.warrantyMonths === null ? "" : String(product.warrantyMonths),
  });
}
