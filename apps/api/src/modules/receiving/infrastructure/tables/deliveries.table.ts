import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { PAYMENT_RULE_TYPES, TIME_UNITS, type PaymentRuleType } from "@books/shared";
import { createdAtColumn, idColumn, oneOf } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { suppliers } from "../../../suppliers/infrastructure/tables/suppliers.table";

/**
 * A saved delivery (F04): a record that is never edited (G4); corrections come in F04b. The
 * payment rule it was made under is copied here (typed columns, like a supplier row), so a
 * later change of the supplier rule does not touch it. Money lives in the stock layers, the
 * payments and the ledger, not here. SELECT and INSERT only for the app role.
 */
export const deliveries = pgTable(
  "deliveries",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    /** Running number per business (1, 2, 3 ...). */
    number: integer("number").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    locationId: uuid("location_id").notNull(),
    invoiceNumber: text("invoice_number"),
    note: text("note"),
    paymentType: text("payment_type").$type<PaymentRuleType>().notNull(),
    paymentPeriodValue: integer("payment_period_value"),
    paymentPeriodUnit: text("payment_period_unit").$type<(typeof TIME_UNITS)[number]>(),
    /** Calendar date (Kenya time) the owed amount is due; null for rules that are not date based. */
    dueDate: date("due_date", { mode: "string" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    unique("deliveries_tenant_id_unique").on(t.tenantId, t.id),
    unique("deliveries_tenant_number_unique").on(t.tenantId, t.number),
    index("deliveries_tenant_created_idx").on(t.tenantId, t.createdAt, t.id),
    index("deliveries_supplier_idx").on(t.tenantId, t.supplierId),
    check("deliveries_payment_type", oneOf(t.paymentType, PAYMENT_RULE_TYPES)),
    check(
      "deliveries_period_unit",
      sql`${t.paymentPeriodUnit} is null or ${t.paymentPeriodUnit} in ('days', 'weeks', 'months')`,
    ),
    check(
      "deliveries_period_matches_type",
      sql`(${t.paymentType} in ('within_time', 'after_sold_with_latest_date')) = (${t.paymentPeriodValue} is not null and ${t.paymentPeriodUnit} is not null) and ((${t.paymentPeriodValue} is null) = (${t.paymentPeriodUnit} is null))`,
    ),
    foreignKey({
      name: "deliveries_supplier_fk",
      columns: [t.tenantId, t.supplierId],
      foreignColumns: [suppliers.tenantId, suppliers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "deliveries_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type DeliveryRow = typeof deliveries.$inferSelect;
