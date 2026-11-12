import type { Permission } from "@books/shared";

/** Who may open the Stock screen: the same three permissions the stock API accepts. */
export const STOCK_VIEW_PERMISSIONS: Permission[] = [
  "receive_stock",
  "manage_products",
  "view_reports",
];
