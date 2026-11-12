import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { CURRENCIES } from "@books/shared";
import { createdAtColumn, idColumn, oneOf } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { moneyPlaces } from "../../../locations/infrastructure/tables/money-places.table";
import { suppliers } from "../../../suppliers/infrastructure/tables/suppliers.table";
import { ledgerEntries } from "./ledger-entries.table";

export const LEDGER_ACCOUNTS = ["inventory", "supplier_payable", "money_place"] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

/**
 * One side of an entry. `amountCents` is signed: a debit (more stock, more money in a place)
 * is positive, a credit (money out, more owed to a supplier) is negative, so the lines of an
 * entry sum to zero. Append-only, under row-level security.
 */
export const ledgerLines = pgTable(
  "ledger_lines",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    entryId: uuid("entry_id").notNull(),
    account: text("account").$type<LedgerAccount>().notNull(),
    supplierId: uuid("supplier_id"),
    moneyPlaceId: uuid("money_place_id"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    currency: text("currency").$type<(typeof CURRENCIES)[number]>().notNull().default("KES"),
    /** The same amount in KES (equal to `amountCents` for KES lines). */
    amountKesCents: bigint("amount_kes_cents", { mode: "number" }).notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index("ledger_lines_entry_idx").on(t.tenantId, t.entryId),
    index("ledger_lines_supplier_idx").on(t.tenantId, t.supplierId),
    index("ledger_lines_money_place_idx").on(t.tenantId, t.moneyPlaceId),
    check("ledger_lines_account", oneOf(t.account, LEDGER_ACCOUNTS)),
    check("ledger_lines_currency", oneOf(t.currency, CURRENCIES)),
    check("ledger_lines_not_zero", sql`${t.amountCents} <> 0`),
    check(
      "ledger_lines_account_reference",
      sql`(${t.account} = 'supplier_payable') = (${t.supplierId} is not null) and (${t.account} = 'money_place') = (${t.moneyPlaceId} is not null)`,
    ),
    foreignKey({
      name: "ledger_lines_entry_fk",
      columns: [t.tenantId, t.entryId],
      foreignColumns: [ledgerEntries.tenantId, ledgerEntries.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "ledger_lines_supplier_fk",
      columns: [t.tenantId, t.supplierId],
      foreignColumns: [suppliers.tenantId, suppliers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "ledger_lines_money_place_fk",
      columns: [t.tenantId, t.moneyPlaceId],
      foreignColumns: [moneyPlaces.tenantId, moneyPlaces.id],
    }).onDelete("restrict"),
  ],
);

export type LedgerLineRow = typeof ledgerLines.$inferSelect;
