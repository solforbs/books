import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { users } from "./users.table";

export const TENANT_STATUSES = ["active", "disabled"] as const;

/** A business. Its `id` is the `tenant_id` stamped on every tenant-owned row. */
export const tenants = pgTable(
  "tenants",
  {
    id: idColumn(),
    name: text("name").notNull(),
    status: text("status").$type<(typeof TENANT_STATUSES)[number]>().notNull().default("active"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [check("tenants_status", oneOf(t.status, TENANT_STATUSES))],
);

export type TenantRow = typeof tenants.$inferSelect;
