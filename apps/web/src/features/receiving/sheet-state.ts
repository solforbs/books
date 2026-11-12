import type { Product } from "@books/shared";

export type CostMode = "each" | "total";

/** One row of the stock-in sheet. Numbers are kept as typed so editing never fights the person. */
export interface SheetRow {
  key: string;
  product: Product;
  /** Empty means pieces. */
  packUnitId: string;
  quantity: string;
  costMode: CostMode;
  cost: string;
  unitsText: string;
}

export type SheetAction =
  | { type: "add"; product: Product; key: string }
  | { type: "patch"; key: string; patch: Partial<Omit<SheetRow, "key" | "product">> }
  | { type: "remove"; key: string };

function newRow(product: Product, key: string): SheetRow {
  return {
    key,
    product,
    packUnitId: "",
    quantity: "1",
    costMode: "total",
    cost: "",
    unitsText: "",
  };
}

/**
 * Adding a product that already has a row adds 1 to that row (scanning the same barcode again,
 * F04 section 2) instead of creating a second row.
 */
export function sheetReducer(rows: SheetRow[], action: SheetAction): SheetRow[] {
  switch (action.type) {
    case "add": {
      const existing = rows.find((r) => r.product.id === action.product.id);
      if (!existing) return [...rows, newRow(action.product, action.key)];
      const quantity = Number(existing.quantity);
      const next = Number.isInteger(quantity) && quantity >= 1 ? String(quantity + 1) : "1";
      return rows.map((r) => (r === existing ? { ...r, quantity: next } : r));
    }
    case "patch":
      return rows.map((r) => (r.key === action.key ? { ...r, ...action.patch } : r));
    case "remove":
      return rows.filter((r) => r.key !== action.key);
  }
}
