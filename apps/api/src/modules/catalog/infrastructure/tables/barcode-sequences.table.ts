import { sql } from "drizzle-orm";
import { bigint, check, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { idColumn, updatedAtColumn } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";

/**
 * Per-business counter behind shop barcodes (`shopBarcodeFromSequence`). One row per
 * business, advanced with a single atomic upsert, so concurrent requests can never be
 * handed the same number.
 */
export const barcodeSequences = pgTable(
  "barcode_sequences",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    lastValue: bigint("last_value", { mode: "number" }).notNull().default(0),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("barcode_sequences_tenant_unique").on(t.tenantId),
    check("barcode_sequences_range", sql`${t.lastValue} >= 0 and ${t.lastValue} <= 9999999999`),
  ],
);

export type BarcodeSequenceRow = typeof barcodeSequences.$inferSelect;
