import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  idColumn,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { products } from "./products.table";

/**
 * Box / carton of a quantity product (F01 §4). A pack's size never changes once created:
 * a different size means retiring the pack and adding a new one (F01 §10).
 */
export const productPackUnits = pgTable(
  "product_pack_units",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    wholesalePrice: bigint("wholesale_price", { mode: "number" }),
    retailPrice: bigint("retail_price", { mode: "number" }),
    active: boolean("active").notNull().default(true),
    retiredAt: timestampTz("retired_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("product_pack_units_tenant_id_unique").on(t.tenantId, t.id),
    foreignKey({
      name: "product_pack_units_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    index("product_pack_units_product_idx").on(t.tenantId, t.productId),
    uniqueIndex("product_pack_units_active_name_unique")
      .on(t.tenantId, t.productId, sql`lower(${t.name})`)
      .where(sql`${t.active}`),
    check("product_pack_units_size", sql`${t.size} >= 2`),
  ],
);

export type PackUnitRow = typeof productPackUnits.$inferSelect;
