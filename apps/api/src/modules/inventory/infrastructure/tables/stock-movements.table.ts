import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, oneOf } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { products } from "../../../catalog/infrastructure/tables/products.table";
import { stockLayers } from "./stock-layers.table";
import { stockUnits } from "./stock-units.table";

/** `receive` changes the quantity of a layer; `unit_added` registers an IMEI/serial (change 0). */
export const MOVEMENT_TYPES = ["receive", "unit_added"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/**
 * Append-only log of every change of quantity or unit (ARCH-02 section 2.1). The app role
 * cannot update or delete it; a mistake is a reversing movement (G4). `quantityDelta` is in
 * pieces. Under row-level security.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    type: text("type").$type<MovementType>().notNull(),
    productId: uuid("product_id").notNull(),
    locationId: uuid("location_id").notNull(),
    layerId: uuid("layer_id"),
    unitId: uuid("unit_id"),
    quantityDelta: integer("quantity_delta").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index("stock_movements_product_location_idx").on(t.tenantId, t.productId, t.locationId),
    index("stock_movements_source_idx").on(t.tenantId, t.sourceType, t.sourceId),
    check("stock_movements_type", oneOf(t.type, MOVEMENT_TYPES)),
    check(
      "stock_movements_delta",
      sql`(${t.type} = 'receive' and ${t.quantityDelta} > 0) or (${t.type} = 'unit_added' and ${t.quantityDelta} = 0)`,
    ),
    foreignKey({
      name: "stock_movements_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_movements_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_movements_layer_fk",
      columns: [t.tenantId, t.layerId],
      foreignColumns: [stockLayers.tenantId, stockLayers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_movements_unit_fk",
      columns: [t.tenantId, t.unitId],
      foreignColumns: [stockUnits.tenantId, stockUnits.id],
    }).onDelete("restrict"),
  ],
);

export type StockMovementRow = typeof stockMovements.$inferSelect;
