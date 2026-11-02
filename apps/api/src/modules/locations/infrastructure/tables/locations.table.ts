import { boolean, check, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { LOCATION_STATUSES, LOCATION_TYPES, PRICE_LISTS, type Location } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";

/** Shops and stores (F02 §3). Closed, never deleted (G4). Under row-level security. */
export const locations = pgTable(
  "locations",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    type: text("type").$type<Location["type"]>().notNull(),
    canSell: boolean("can_sell").notNull(),
    priceList: text("price_list").$type<Location["priceList"]>().notNull().default("retail"),
    status: text("status").$type<Location["status"]>().notNull().default("open"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    // Target of composite foreign keys from link tables (same-business guarantee).
    unique("locations_tenant_id_unique").on(t.tenantId, t.id),
    index("locations_tenant_status_idx").on(t.tenantId, t.status),
    check("locations_type", oneOf(t.type, LOCATION_TYPES)),
    check("locations_price_list", oneOf(t.priceList, PRICE_LISTS)),
    check("locations_status", oneOf(t.status, LOCATION_STATUSES)),
  ],
);

export type LocationRow = typeof locations.$inferSelect;
