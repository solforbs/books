import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import {
  CURRENCIES,
  PAYMENT_RULE_TYPES,
  SUPPLIER_STATUSES,
  TIME_UNITS,
  type PaymentRuleType,
} from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

/**
 * Everyone the shop buys from (F03 §3). Never deleted (G4): `status` moves between waiting /
 * active / hidden. The payment rule is stored as typed columns (type + optional period), so
 * the database itself refuses a rule without its period. Under row-level security.
 */
export const suppliers = pgTable(
  "suppliers",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Normalised name, for ordering and the similar-name check. */
    nameKey: text("name_key").notNull(),
    /** Normalised phone (+254... or +<country code>...); null only for a waiting quick-add. */
    phone: text("phone"),
    paymentType: text("payment_type").$type<PaymentRuleType>().notNull().default("cash"),
    paymentPeriodValue: integer("payment_period_value"),
    paymentPeriodUnit: text("payment_period_unit").$type<(typeof TIME_UNITS)[number]>(),
    currency: text("currency").$type<(typeof CURRENCIES)[number]>().notNull().default("KES"),
    isNeighbour: boolean("is_neighbour").notNull().default(false),
    kraPin: text("kra_pin"),
    marketOrLocation: text("market_or_location"),
    notes: text("notes"),
    status: text("status").$type<SupplierStatus>().notNull().default("active"),
    /** The status a hidden supplier returns to when it is shown again. */
    hiddenFrom: text("hidden_from").$type<"waiting" | "active">(),
    addedByUserId: uuid("added_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("suppliers_tenant_id_unique").on(t.tenantId, t.id),
    // One supplier per phone number in a business, whatever its status (hidden included).
    uniqueIndex("suppliers_phone_unique")
      .on(t.tenantId, t.phone)
      .where(sql`${t.phone} is not null`),
    index("suppliers_tenant_status_name_idx").on(t.tenantId, t.status, t.nameKey, t.id),
    check("suppliers_status", oneOf(t.status, SUPPLIER_STATUSES)),
    check("suppliers_currency", oneOf(t.currency, CURRENCIES)),
    check("suppliers_payment_type", oneOf(t.paymentType, PAYMENT_RULE_TYPES)),
    check(
      "suppliers_period_unit",
      sql`${t.paymentPeriodUnit} is null or ${t.paymentPeriodUnit} in ('days', 'weeks', 'months')`,
    ),
    check(
      "suppliers_period_matches_type",
      sql`(${t.paymentType} in ('within_time', 'after_sold_with_latest_date')) = (${t.paymentPeriodValue} is not null and ${t.paymentPeriodUnit} is not null) and ((${t.paymentPeriodValue} is null) = (${t.paymentPeriodUnit} is null))`,
    ),
    check(
      "suppliers_phone_unless_waiting",
      sql`${t.phone} is not null or ${t.status} = 'waiting' or (${t.status} = 'hidden' and ${t.hiddenFrom} = 'waiting')`,
    ),
  ],
);

export type SupplierRow = typeof suppliers.$inferSelect;
