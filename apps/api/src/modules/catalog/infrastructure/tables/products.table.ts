import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { PRODUCT_STATUSES, TRACKING_TYPES, VAT_TYPES } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";
import { productCategories } from "./product-categories.table";

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_SOURCES = ["form", "bulk", "quick_add", "import"] as const;

/**
 * One sellable thing with one price and one stock (F01 §3). Money columns are integer
 * cents (bigint, read back as numbers: the contract caps them far below 2^53).
 * Never deleted (G4): `status` moves between waiting / active / hidden / merged / rejected.
 * No cost column: buying costs belong to stock-in (F04), never to this table.
 */
export const products = pgTable(
  "products",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").notNull(),
    name: text("name").notNull(),
    /** Normalised name, for ordering and the similar-name check. */
    nameKey: text("name_key").notNull(),
    brand: text("brand"),
    model: text("model"),
    storage: text("storage"),
    colour: text("colour"),
    condition: text("condition"),
    trackingType: text("tracking_type").$type<(typeof TRACKING_TYPES)[number]>().notNull(),
    baseUnit: text("base_unit").notNull().default("piece"),
    retailPrice: bigint("retail_price", { mode: "number" }),
    wholesalePrice: bigint("wholesale_price", { mode: "number" }),
    minPrice: bigint("min_price", { mode: "number" }),
    vatType: text("vat_type").$type<(typeof VAT_TYPES)[number]>(),
    canBeGivenFree: boolean("can_be_given_free").notNull().default(false),
    warrantyMonths: integer("warranty_months"),
    status: text("status").$type<ProductStatus>().notNull().default("active"),
    /** Where a hidden product returns to when it is unhidden. */
    hiddenFrom: text("hidden_from").$type<"active" | "waiting">(),
    mergedIntoId: uuid("merged_into_id"),
    /** Same brand+model+storage+colour+condition (or the same typed name) after cleaning. */
    duplicateKey: text("duplicate_key").notNull(),
    /** Brand+model+storage+colour: products that may differ in condition alone (F01 §7). */
    conditionFamilyKey: text("condition_family_key"),
    /** Brand+model: "all iPhone 13 Pro" (F01 §3). */
    modelGroupKey: text("model_group_key"),
    addedByUserId: uuid("added_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    source: text("source").$type<(typeof PRODUCT_SOURCES)[number]>().notNull().default("form"),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestampTz("decided_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    // Target of composite foreign keys (same-business guarantee for every link table).
    unique("products_tenant_id_unique").on(t.tenantId, t.id),
    foreignKey({
      name: "products_category_fk",
      columns: [t.tenantId, t.categoryId],
      foreignColumns: [productCategories.tenantId, productCategories.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "products_merged_into_fk",
      columns: [t.tenantId, t.mergedIntoId],
      foreignColumns: [t.tenantId, t.id],
    }).onDelete("restrict"),
    // Exact duplicates are blocked while a product is live; merged/rejected ones free the key.
    uniqueIndex("products_duplicate_key_unique")
      .on(t.tenantId, t.duplicateKey)
      .where(sql`${t.status} not in ('merged', 'rejected')`),
    index("products_tenant_status_name_idx").on(t.tenantId, t.status, t.nameKey, t.id),
    index("products_tenant_category_idx").on(t.tenantId, t.categoryId),
    index("products_tenant_model_group_idx").on(t.tenantId, t.modelGroupKey),
    index("products_tenant_family_idx").on(t.tenantId, t.conditionFamilyKey),
    check("products_status", oneOf(t.status, PRODUCT_STATUSES)),
    check("products_tracking", oneOf(t.trackingType, TRACKING_TYPES)),
    check("products_vat_type", sql`${t.vatType} is null or ${oneOf(t.vatType, VAT_TYPES)}`),
    check("products_source", oneOf(t.source, PRODUCT_SOURCES)),
    check(
      "products_prices_not_negative",
      sql`coalesce(${t.retailPrice}, 0) >= 0 and coalesce(${t.wholesalePrice}, 0) >= 0 and coalesce(${t.minPrice}, 0) >= 0`,
    ),
    check(
      "products_merged_target",
      sql`(${t.status} = 'merged') = (${t.mergedIntoId} is not null)`,
    ),
    check("products_not_merged_into_self", sql`${t.mergedIntoId} <> ${t.id}`),
  ],
);

export type ProductRow = typeof products.$inferSelect;
