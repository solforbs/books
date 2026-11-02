import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { MONEY_PLACE_TYPES, type MoneyPlaceType } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { locations } from "./locations.table";

/**
 * Where money is kept (F02 §3, F11 §3.4): cash drawers (one per selling location,
 * created by the system), M-Pesa Till/Paybill, bank accounts, safes. Hidden,
 * never deleted (G4). Under row-level security.
 */
export const moneyPlaces = pgTable(
  "money_places",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    type: text("type").$type<MoneyPlaceType>().notNull(),
    name: text("name").notNull(),
    number: text("number"),
    /** Paybill "linked to a bank": a bank money place of the same business. */
    settlesToId: uuid("settles_to_id"),
    /** Set only on cash drawers: the one location the drawer belongs to. */
    drawerLocationId: uuid("drawer_location_id"),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("money_places_tenant_id_unique").on(t.tenantId, t.id),
    // At most one cash drawer per location, ever (a closed location keeps its drawer).
    unique("money_places_drawer_location_unique").on(t.drawerLocationId),
    index("money_places_tenant_idx").on(t.tenantId),
    check("money_places_type", oneOf(t.type, MONEY_PLACE_TYPES)),
    check(
      "money_places_drawer_location",
      sql`(${t.type} = 'cash_drawer') = (${t.drawerLocationId} is not null)`,
    ),
    check("money_places_not_self_settling", sql`${t.settlesToId} <> ${t.id}`),
    foreignKey({
      name: "money_places_settles_to_fk",
      columns: [t.tenantId, t.settlesToId],
      foreignColumns: [t.tenantId, t.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "money_places_drawer_location_fk",
      columns: [t.tenantId, t.drawerLocationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type MoneyPlaceRow = typeof moneyPlaces.$inferSelect;
