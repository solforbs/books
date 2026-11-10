import { bigint, foreignKey, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { products } from "./products.table";

/**
 * A price that overrides the business price at one location (F01 §4). Clearing a price
 * sets both columns to null; the row stays (G4).
 */
export const productLocationPrices = pgTable(
  "product_location_prices",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    locationId: uuid("location_id").notNull(),
    retailPrice: bigint("retail_price", { mode: "number" }),
    wholesalePrice: bigint("wholesale_price", { mode: "number" }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("product_location_prices_unique").on(t.productId, t.locationId),
    foreignKey({
      name: "product_location_prices_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "product_location_prices_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type LocationPriceRow = typeof productLocationPrices.$inferSelect;
