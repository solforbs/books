import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { UNIT_STATUSES } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { products } from "../../../catalog/infrastructure/tables/products.table";
import { stockLayers } from "./stock-layers.table";

export type UnitStatus = (typeof UNIT_STATUSES)[number];
/** Statuses in which the phone is physically still with the shop (or being kept for a sale). */
export const LIVE_UNIT_STATUSES = ["in_stock", "reserved", "damaged"] as const;
const LIVE_SQL = sql`('in_stock', 'reserved', 'damaged')`;

/**
 * One row per IMEI or serial unit (ARCH-02 section 2.1), with its own exact cost. The same
 * number can be live only once in a business (partial unique indexes); a phone that is sold
 * and comes back is a second row. The cost can be set once after a price-pending delivery
 * (trigger), nothing else is edited yet. Under row-level security.
 */
export const stockUnits = pgTable(
  "stock_units",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    locationId: uuid("location_id").notNull(),
    layerId: uuid("layer_id").notNull(),
    imei: text("imei"),
    imei2: text("imei2"),
    serial: text("serial"),
    status: text("status").$type<UnitStatus>().notNull().default("in_stock"),
    costCents: bigint("cost_cents", { mode: "number" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("stock_units_tenant_id_unique").on(t.tenantId, t.id),
    index("stock_units_layer_idx").on(t.tenantId, t.layerId),
    index("stock_units_product_location_idx").on(t.tenantId, t.productId, t.locationId, t.status),
    index("stock_units_imei_idx").on(t.tenantId, t.imei),
    index("stock_units_imei2_idx").on(t.tenantId, t.imei2),
    index("stock_units_serial_idx").on(t.tenantId, t.serial),
    uniqueIndex("stock_units_imei_live_unique")
      .on(t.tenantId, t.imei)
      .where(sql`${t.imei} is not null and ${t.status} in ${LIVE_SQL}`),
    uniqueIndex("stock_units_imei2_live_unique")
      .on(t.tenantId, t.imei2)
      .where(sql`${t.imei2} is not null and ${t.status} in ${LIVE_SQL}`),
    uniqueIndex("stock_units_serial_live_unique")
      .on(t.tenantId, t.productId, t.serial)
      .where(sql`${t.serial} is not null and ${t.status} in ${LIVE_SQL}`),
    check("stock_units_status", oneOf(t.status, UNIT_STATUSES)),
    check("stock_units_has_number", sql`${t.imei} is not null or ${t.serial} is not null`),
    check("stock_units_cost", sql`${t.costCents} is null or ${t.costCents} >= 0`),
    foreignKey({
      name: "stock_units_layer_fk",
      columns: [t.tenantId, t.layerId],
      foreignColumns: [stockLayers.tenantId, stockLayers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_units_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "stock_units_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type StockUnitRow = typeof stockUnits.$inferSelect;
