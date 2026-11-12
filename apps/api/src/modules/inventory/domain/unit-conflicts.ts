import { LIVE_UNIT_STATUSES, type StockUnitRow } from "../infrastructure/tables/stock-units.table";
import type { UnitNumbers } from "./unit-numbers";

/**
 * Why a number cannot simply be received (F04 section 4.3): it is in stock somewhere in the
 * business right now, or it was here before and left (sold, lost): then an owner or manager
 * must confirm it is a phone that came back.
 */
export interface UnitConflict {
  number: string;
  kind: "in_stock" | "sold_before";
  /** The existing unit that carries the number. */
  unit: StockUnitRow;
}

const isLive = (unit: StockUnitRow) =>
  (LIVE_UNIT_STATUSES as readonly string[]).includes(unit.status);

/** In-stock conflicts come first, so the caller can report the harder problem first. */
export function classifyConflicts(
  productId: string,
  units: UnitNumbers[],
  existing: StockUnitRow[],
): UnitConflict[] {
  const found: UnitConflict[] = [];
  for (const unit of units) {
    const wanted = [unit.imei, unit.imei2].filter((v): v is string => v !== null);
    for (const number of wanted) {
      for (const row of existing) {
        if (row.imei === number || row.imei2 === number) {
          found.push({ number, kind: isLive(row) ? "in_stock" : "sold_before", unit: row });
        }
      }
    }
    if (unit.serial !== null) {
      for (const row of existing) {
        if (row.productId === productId && row.serial === unit.serial) {
          found.push({
            number: unit.serial,
            kind: isLive(row) ? "in_stock" : "sold_before",
            unit: row,
          });
        }
      }
    }
  }
  return found.sort((a, b) => Number(b.kind === "in_stock") - Number(a.kind === "in_stock"));
}
