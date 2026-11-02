import { boolean, foreignKey, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "../../../../common/database/columns";
import { locations } from "./locations.table";
import { moneyPlaces } from "./money-places.table";

/**
 * Which locations offer a money place (shared or separate, F02 §3). Unlinking
 * sets `active = false`; never deleted (G4). Composite foreign keys keep both
 * ends inside the same business.
 */
export const moneyPlaceLocations = pgTable(
  "money_place_locations",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id").notNull(),
    moneyPlaceId: uuid("money_place_id").notNull(),
    locationId: uuid("location_id").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("money_place_locations_place_location_unique").on(t.moneyPlaceId, t.locationId),
    index("money_place_locations_tenant_location_idx").on(t.tenantId, t.locationId),
    foreignKey({
      name: "money_place_locations_place_fk",
      columns: [t.tenantId, t.moneyPlaceId],
      foreignColumns: [moneyPlaces.tenantId, moneyPlaces.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "money_place_locations_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type MoneyPlaceLocationRow = typeof moneyPlaceLocations.$inferSelect;
