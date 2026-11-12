import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { TRACKING_TYPES } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { products } from "../../../catalog/infrastructure/tables/products.table";
import { suppliers } from "../../../suppliers/infrastructure/tables/suppliers.table";

/**
 * One cost layer per delivery line (ARCH-02 section 2.1). Quantity goods are sold from the
 * OLDEST layer first (G7), so `receivedAt` orders them. `costTotalCents` is what the supplier
 * charged for the whole layer (null while the price is pending); a unit cost is not always a
 * whole number of cents, so the total is kept, never a rounded cost each.
 *
 * Not editable except one thing: the cost can be entered once (database trigger), and the app
 * role holds UPDATE on that column only. Under row-level security.
 */
export const stockLayers = pgTable(
  "stock_layers",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    locationId: uuid("location_id").notNull(),
    supplierId: uuid("supplier_id"),
    /**
     * How the product is counted, copied here because it cannot change while stock exists
     * (F01): quantity layers are consumed oldest first; imei/serial layers are filled by units.
     */
    trackingType: text("tracking_type").$type<(typeof TRACKING_TYPES)[number]>().notNull(),
    /** The document that created the layer (a delivery; later starting stock). */
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    receivedQuantity: integer("received_quantity").notNull(),
    remainingQuantity: integer("remaining_quantity").notNull(),
    costTotalCents: bigint("cost_total_cents", { mode: "number" }),
    receivedAt: timestampTz("received_at").notNull().defaultNow(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("stock_layers_tenant_id_unique").on(t.tenantId, t.id),
    index("stock_layers_fifo_idx").on(t.tenantId, t.productId, t.locationId, t.receivedAt, t.id),
    index("stock_layers_source_idx").on(t.tenantId, t.sourceType, t.sourceId),
    check("stock_layers_tracking", oneOf(t.trackingType, TRACKING_TYPES)),
    check("stock_layers_received", sql`${t.receivedQuantity} > 0`),
    check(
      "stock_layers_remaining",
      sql`${t.remainingQuantity} >= 0 and ${t.remainingQuantity} <= ${t.receivedQuantity}`,
    ),
    check("stock_layers_cost", sql`${t.costTotalCents} is null or ${t.costTotalCents} >= 0`),
    foreignKey({
      name: "stock_layers_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_layers_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_layers_supplier_fk",
      columns: [t.tenantId, t.supplierId],
      foreignColumns: [suppliers.tenantId, suppliers.id],
    }).onDelete("restrict"),
  ],
);

export type StockLayerRow = typeof stockLayers.$inferSelect;
