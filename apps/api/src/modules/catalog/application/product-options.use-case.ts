import { Injectable } from "@nestjs/common";
import {
  STARTER_CONDITIONS,
  normalizeForCompare,
  type ProductOptionsResponse,
} from "@books/shared";
import { ProductsRepository } from "../infrastructure/products.repository";

/** One entry per spelling-insensitive value, keeping the first (most used) spelling. */
function distinct(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const key = normalizeForCompare(v);
    if (key && !seen.has(key)) seen.set(key, v);
  }
  return [...seen.values()];
}

/**
 * `GET /products/options` (any member): suggestions for the typing fields, taken from what
 * the business already uses, most used first (F01 §4, §6). Conditions always start with the
 * starter list New / Ex-UK / Refurbished / Used.
 */
@Injectable()
export class ProductOptionsUseCase {
  constructor(private readonly products: ProductsRepository) {}

  async execute(tenantId: string): Promise<ProductOptionsResponse> {
    const [brands, storages, colours, conditions, models] = await Promise.all([
      this.products.distinctValues(tenantId, "brand"),
      this.products.distinctValues(tenantId, "storage"),
      this.products.distinctValues(tenantId, "colour"),
      this.products.distinctValues(tenantId, "condition"),
      this.products.distinctModels(tenantId),
    ]);
    const seenModels = new Set<string>();
    return {
      brands: distinct(brands),
      storages: distinct(storages),
      colours: distinct(colours),
      conditions: distinct([...STARTER_CONDITIONS, ...conditions]),
      models: models.filter((m) => {
        const key = `${normalizeForCompare(m.brand ?? "")}|${normalizeForCompare(m.model)}`;
        if (seenModels.has(key)) return false;
        seenModels.add(key);
        return true;
      }),
    };
  }
}
