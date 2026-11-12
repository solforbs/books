import type { Product } from "@books/shared";

/**
 * The product as someone who may not see selling prices gets it (F01 §11, owner switch):
 * every price is removed, including the ones inside pack units and per-location prices.
 * Null reads as "no price" to the API's clients, so they also check the business switch
 * before showing anything price-related.
 */
export function withoutPrices(product: Product): Product {
  return {
    ...product,
    retailPrice: null,
    wholesalePrice: null,
    minPrice: null,
    locationPrices: [],
    packUnits: product.packUnits.map((p) => ({ ...p, retailPrice: null, wholesalePrice: null })),
  };
}

function stripPackPrices(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.wholesalePrice;
  delete rest.retailPrice;
  return rest;
}

/** A history entry about a pack, without the pack's prices (kept name and size). */
export function withoutPackPrices<T extends { before: unknown; after: unknown }>(entry: T): T {
  return { ...entry, before: stripPackPrices(entry.before), after: stripPackPrices(entry.after) };
}
