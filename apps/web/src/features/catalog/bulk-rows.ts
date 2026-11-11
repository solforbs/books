import {
  buildProductName,
  productSchema,
  type BulkCreateResponse,
  type Product,
} from "@books/shared";

export interface BulkRowData {
  /** Stable id of the combination, so ticks and prices survive when chips change. */
  key: string;
  storage: string;
  colour: string;
  condition: string;
  name: string;
}

/** Storage x colour x condition -> one row per combination (2 x 3 x 1 = 6). */
export function expandRows(input: {
  brand: string;
  model: string;
  storages: string[];
  colours: string[];
  conditions: string[];
}): BulkRowData[] {
  const rows: BulkRowData[] = [];
  for (const storage of input.storages) {
    for (const colour of input.colours) {
      for (const condition of input.conditions) {
        rows.push({
          key: [storage, colour, condition].join("|").toLowerCase(),
          storage,
          colour,
          condition,
          name: buildProductName({
            brand: input.brand,
            model: input.model,
            storage,
            colour,
            condition,
          }),
        });
      }
    }
  }
  return rows;
}

/** What happened to one row after "Create". */
export type RowOutcome =
  | { kind: "created"; product: Product }
  | { kind: "duplicate"; productId: string | null }
  | { kind: "similar"; products: Product[] }
  | { kind: "needsPrice" }
  | { kind: "invalid" }
  | { kind: "error"; code: string };

type BulkResult = BulkCreateResponse["results"][number];

export function outcomeFromResult(result: BulkResult): RowOutcome {
  if (result.product) return { kind: "created", product: result.product };
  const code = result.error?.code ?? "unknown";
  const details = (result.error?.details ?? {}) as Record<string, unknown>;
  if (code === "duplicate_product") {
    return {
      kind: "duplicate",
      productId: typeof details.existingId === "string" ? details.existingId : null,
    };
  }
  if (code === "similar_products") {
    const products = productSchema.array().safeParse(details.products);
    return { kind: "similar", products: products.success ? products.data : [] };
  }
  return { kind: "error", code };
}
