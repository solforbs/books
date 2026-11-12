import { sql } from "drizzle-orm";
import { bigint, boolean, check, foreignKey, index, pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { moneyPlaces } from "../../../locations/infrastructure/tables/money-places.table";
import { deliveries } from "./deliveries.table";

/** Money paid to the supplier at delivery, one row per money place used. */
export const deliveryPayments = pgTable(
  "delivery_payments",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    deliveryId: uuid("delivery_id").notNull(),
    moneyPlaceId: uuid("money_place_id").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    /** The drawer went below zero because of this payment (an owner or manager allowed it). */
    drawerNegative: boolean("drawer_negative").notNull().default(false),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index("delivery_payments_delivery_idx").on(t.tenantId, t.deliveryId),
    check("delivery_payments_amount", sql`${t.amountCents} > 0`),
    foreignKey({
      name: "delivery_payments_delivery_fk",
      columns: [t.tenantId, t.deliveryId],
      foreignColumns: [deliveries.tenantId, deliveries.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "delivery_payments_money_place_fk",
      columns: [t.tenantId, t.moneyPlaceId],
      foreignColumns: [moneyPlaces.tenantId, moneyPlaces.id],
    }).onDelete("restrict"),
  ],
);

export type DeliveryPaymentRow = typeof deliveryPayments.$inferSelect;
