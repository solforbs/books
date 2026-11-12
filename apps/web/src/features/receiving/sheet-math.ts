import { parseShillings } from "@books/shared";
import type { SheetRow } from "./sheet-state";

export type RowCost =
  { state: "pending" } | { state: "known"; totalCents: number } | { state: "invalid" };

/** The quantity as a whole number of 1 or more, or null while it is not one. */
export function rowQuantity(row: SheetRow): number | null {
  const text = row.quantity.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value >= 1 && value <= 100_000 ? value : null;
}

export function packSize(row: SheetRow): number {
  const pack = row.product.packUnits.find((p) => p.id === row.packUnitId);
  return pack?.size ?? 1;
}

/** Stock is always stored in pieces (F04 section 2). */
export function rowPieces(row: SheetRow): number | null {
  const quantity = rowQuantity(row);
  return quantity === null ? null : quantity * packSize(row);
}

function parseCents(text: string): number | null {
  try {
    const value = parseShillings(text);
    return value > 0 && value <= 100_000_000_000 ? value : null;
  } catch {
    return null;
  }
}

/**
 * The screen turns "cost each" into a line total in whole cents (F04a: the API only takes the
 * line total). An empty cost means the price is pending.
 */
export function rowCost(row: SheetRow): RowCost {
  if (row.cost.trim() === "") return { state: "pending" };
  const typed = parseCents(row.cost);
  if (typed === null) return { state: "invalid" };
  if (row.costMode === "total") return { state: "known", totalCents: typed };
  const quantity = rowQuantity(row);
  if (quantity === null) return { state: "invalid" };
  const total = typed * quantity;
  return total <= 100_000_000_000 ? { state: "known", totalCents: total } : { state: "invalid" };
}

/** What one piece costs, rounded to a cent; shown beside the cost so a mix-up is visible. */
export function costPerPiece(totalCents: number, pieces: number): number {
  return Math.round(totalCents / pieces);
}

/** The cost each in the chosen unit, for showing the other side of "each or total". */
export function costEach(totalCents: number, quantity: number): number {
  return Math.round(totalCents / quantity);
}
