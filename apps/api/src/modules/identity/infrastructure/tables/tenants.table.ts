import { boolean, check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { users } from "./users.table";

export const TENANT_STATUSES = ["active", "disabled"] as const;

/**
 * A business. Its `id` is the `tenant_id` stamped on every tenant-owned row.
 * The details below are printed on receipts and other documents (F02 "Business
 * details for documents"); all optional except the name. KRA PIN optional and
 * VAT off by default (G3).
 */
export const tenants = pgTable(
  "tenants",
  {
    id: idColumn(),
    name: text("name").notNull(),
    status: text("status").$type<(typeof TENANT_STATUSES)[number]>().notNull().default("active"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    address: text("address"),
    /** E.164, normalised by @books/shared. */
    phone: text("phone"),
    email: text("email"),
    kraPin: text("kra_pin"),
    footerNote: text("footer_note"),
    vatEnabled: boolean("vat_enabled").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [check("tenants_status", oneOf(t.status, TENANT_STATUSES))],
);

export type TenantRow = typeof tenants.$inferSelect;
