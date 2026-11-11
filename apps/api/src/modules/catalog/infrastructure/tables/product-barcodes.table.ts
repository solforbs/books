import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { BARCODE_KINDS } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { productPackUnits } from "./product-pack-units.table";
import { products } from "./products.table";

/**
 * Barcodes of a product or one of its packs (F01 §7). Retired, never deleted (G4).
 * Who may share a manufacturer code is decided in code under a per-code advisory lock; the
 * indexes below are the database's second guard: a shop code is unique in the business and
 * a product never carries the same live code twice.
 */
export const productBarcodes = pgTable(
  "product_barcodes",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    packUnitId: uuid("pack_unit_id"),
    value: text("value").notNull(),
    kind: text("kind").$type<(typeof BARCODE_KINDS)[number]>().notNull(),
    active: boolean("active").notNull().default(true),
    retiredAt: timestampTz("retired_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("product_barcodes_tenant_id_unique").on(t.tenantId, t.id),
    foreignKey({
      name: "product_barcodes_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "product_barcodes_pack_fk",
      columns: [t.tenantId, t.packUnitId],
      foreignColumns: [productPackUnits.tenantId, productPackUnits.id],
    }).onDelete("restrict"),
    index("product_barcodes_tenant_value_idx").on(t.tenantId, t.value),
    index("product_barcodes_product_idx").on(t.tenantId, t.productId),
    uniqueIndex("product_barcodes_shop_value_unique")
      .on(t.tenantId, t.value)
      .where(sql`${t.active} and ${t.kind} = 'shop'`),
    uniqueIndex("product_barcodes_product_value_unique")
      .on(t.tenantId, t.productId, t.value)
      .where(sql`${t.active}`),
    check("product_barcodes_kind", oneOf(t.kind, BARCODE_KINDS)),
  ],
);

export type BarcodeRow = typeof productBarcodes.$inferSelect;
