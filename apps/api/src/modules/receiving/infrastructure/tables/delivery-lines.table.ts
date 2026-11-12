import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn } from "../../../../common/database/columns";
import { productPackUnits } from "../../../catalog/infrastructure/tables/product-pack-units.table";
import { products } from "../../../catalog/infrastructure/tables/products.table";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { stockLayers } from "../../../inventory/infrastructure/tables/stock-layers.table";
import { deliveries } from "./deliveries.table";

/**
 * One line of a delivery: what was typed (quantity in its unit) and the layer it created.
 * The cost lives on the layer (it can be entered later), so this row never changes.
 */
export const deliveryLines = pgTable(
  "delivery_lines",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    deliveryId: uuid("delivery_id").notNull(),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id").notNull(),
    packUnitId: uuid("pack_unit_id"),
    /** In the chosen unit (pieces when `packUnitId` is null). */
    quantity: integer("quantity").notNull(),
    pieces: integer("pieces").notNull(),
    layerId: uuid("layer_id").notNull(),
    createdAt: createdAtColumn(),
  },
  (t) => [
    unique("delivery_lines_tenant_id_unique").on(t.tenantId, t.id),
    unique("delivery_lines_delivery_line_unique").on(t.deliveryId, t.lineNo),
    unique("delivery_lines_layer_unique").on(t.layerId),
    index("delivery_lines_delivery_idx").on(t.tenantId, t.deliveryId),
    check("delivery_lines_quantity", sql`${t.quantity} > 0 and ${t.pieces} >= ${t.quantity}`),
    foreignKey({
      name: "delivery_lines_delivery_fk",
      columns: [t.tenantId, t.deliveryId],
      foreignColumns: [deliveries.tenantId, deliveries.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "delivery_lines_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "delivery_lines_pack_fk",
      columns: [t.tenantId, t.packUnitId],
      foreignColumns: [productPackUnits.tenantId, productPackUnits.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "delivery_lines_layer_fk",
      columns: [t.tenantId, t.layerId],
      foreignColumns: [stockLayers.tenantId, stockLayers.id],
    }).onDelete("restrict"),
  ],
);

export type DeliveryLineRow = typeof deliveryLines.$inferSelect;
