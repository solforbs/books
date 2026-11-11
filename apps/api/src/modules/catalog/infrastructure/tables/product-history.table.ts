import { bigint, foreignKey, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";
import { products } from "./products.table";

/**
 * Who changed what on a product, from what to what, and when (F01 §10). Append-only:
 * the app role is granted SELECT and INSERT only, so there is no `updated_at` either.
 */
export const productHistory = pgTable(
  "product_history",
  {
    id: idColumn(),
    /** Entry order inside one product: `at` is the transaction start, equal for entries of one change. */
    seq: bigint("seq", { mode: "number" }).notNull().generatedAlwaysAsIdentity(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    byUserId: uuid("by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    field: text("field"),
    before: jsonb("before"),
    after: jsonb("after"),
    at: createdAtColumn(),
  },
  (t) => [
    foreignKey({
      name: "product_history_product_fk",
      columns: [t.tenantId, t.productId],
      foreignColumns: [products.tenantId, products.id],
    }).onDelete("restrict"),
    index("product_history_product_idx").on(t.tenantId, t.productId, t.at),
  ],
);

export type HistoryRow = typeof productHistory.$inferSelect;
