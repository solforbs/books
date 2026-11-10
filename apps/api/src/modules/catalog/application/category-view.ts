import type { Category } from "@books/shared";
import type { CategoryRow } from "../infrastructure/tables/product-categories.table";

export function toCategory(row: CategoryRow, productCount: number): Category {
  return {
    id: row.id,
    name: row.name,
    defaultTracking: row.defaultTracking,
    namingMode: row.namingMode,
    hidden: row.hidden,
    productCount,
    createdAt: row.createdAt.toISOString(),
  };
}
