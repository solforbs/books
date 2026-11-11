import { boolean, check, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { NAMING_MODES, TRACKING_TYPES } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";

/** The owner's own product categories (F01 §4). Hidden, never deleted (G4). Under row-level security. */
export const productCategories = pgTable(
  "product_categories",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Lower-case comparison form of the name: makes "Phones" and "phones" one category. */
    nameKey: text("name_key").notNull(),
    defaultTracking: text("default_tracking").$type<(typeof TRACKING_TYPES)[number]>().notNull(),
    namingMode: text("naming_mode").$type<(typeof NAMING_MODES)[number]>().notNull(),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("product_categories_tenant_id_unique").on(t.tenantId, t.id),
    unique("product_categories_name_unique").on(t.tenantId, t.nameKey),
    check("product_categories_tracking", oneOf(t.defaultTracking, TRACKING_TYPES)),
    check("product_categories_naming", oneOf(t.namingMode, NAMING_MODES)),
  ],
);

export type CategoryRow = typeof productCategories.$inferSelect;
