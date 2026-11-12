import { check, foreignKey, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, oneOf, timestampTz } from "../../../../common/database/columns";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";

export const LEDGER_ENTRY_TYPES = ["delivery", "cost_entered"] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/**
 * One business event on the books (ARCH-02 §2.2). Append-only: the app role can only insert
 * and read, so a mistake is corrected by a reversing entry (G4). Its lines always add up to
 * zero (checked again by a deferred database trigger). Under row-level security.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    type: text("type").$type<LedgerEntryType>().notNull(),
    occurredAt: timestampTz("occurred_at").notNull().defaultNow(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    locationId: uuid("location_id"),
    /** The document this entry belongs to (a delivery, later a sale, a payment ...). */
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    /** The client command that caused it: makes a repeated write safe (G6). */
    commandId: text("command_id").notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    unique("ledger_entries_tenant_id_unique").on(t.tenantId, t.id),
    unique("ledger_entries_command_unique").on(t.tenantId, t.commandId),
    index("ledger_entries_source_idx").on(t.tenantId, t.sourceType, t.sourceId),
    check("ledger_entries_type", oneOf(t.type, LEDGER_ENTRY_TYPES)),
    foreignKey({
      name: "ledger_entries_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
