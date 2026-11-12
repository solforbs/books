import { PG_UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from "../../../common/database/pg-errors";
import { DeliveryErrors } from "../domain/delivery-errors";

const UNIT_INDEXES = /^stock_units_(imei|imei2|serial)_live_unique$/;

/** The text PostgreSQL attaches to a unique violation, e.g. `Key (tenant_id, imei)=(..., 35...)`. */
function detailOf(err: unknown): string {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const detail = (current as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    current = (current as { cause?: unknown }).cause;
  }
  return "";
}

/**
 * Second guard behind the per-business lock and the in-stock check: if the database itself
 * refuses a duplicate live IMEI/serial (unique index), the answer is still 409 `imei_in_stock`.
 * The shop name is not looked up here (the other request just committed it).
 */
export function rethrowUnitConflict(err: unknown): never {
  if (pgErrorCode(err) === PG_UNIQUE_VIOLATION && UNIT_INDEXES.test(pgConstraint(err) ?? "")) {
    const value = /=\((?:[^,]*,\s*)*([^,()]*)\)\s*already exists/.exec(detailOf(err))?.[1] ?? "";
    throw DeliveryErrors.imeiInStock({ imei: value });
  }
  throw err;
}
