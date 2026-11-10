/**
 * Per-person permission switches (F02 §4.2). The role gives the defaults; the owner
 * can switch individual permissions on or off for one person. Owners always have
 * every permission and can never be restricted (G1).
 */
import type { Role } from "./roles";

export const PERMISSIONS = [
  "manage_business", // business details, VAT setting
  "manage_locations", // add/edit/close locations and money places
  // Add cashiers/storekeepers to own locations and reset their passwords (F02 §2.3).
  // Changing roles, permission switches, or switching people off is owner-only, always.
  "add_staff",
  "approve_items", // approve products/suppliers added by non-approvers (F01, F03)
  "set_prices", // change selling and minimum prices
  "see_cost_profit", // see buying costs and profit
  "sell", // sell and take payments (F06)
  "give_discounts", // change price above the minimum / cart discount (F06)
  "do_refunds", // refund money on returns (F08)
  "receive_stock", // stock in (F04)
  "record_expenses", // expenses (F11)
  "close_day", // close the day (F11)
  "view_reports", // reports and dashboard (F12)
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

/** Defaults per role, from the permission tables in F01–F12. */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: ALL,
  manager: new Set<Permission>([
    "manage_locations",
    "approve_items",
    "set_prices",
    "sell",
    "give_discounts",
    "do_refunds",
    "receive_stock",
    "record_expenses",
    "close_day",
    "view_reports",
  ]),
  cashier: new Set<Permission>(["sell", "give_discounts", "receive_stock", "record_expenses"]),
  storekeeper: new Set<Permission>(["receive_stock"]),
  accountant: new Set<Permission>(["see_cost_profit", "view_reports"]),
};

/** Explicit per-person overrides: true = switched on, false = switched off. */
export type PermissionOverrides = Partial<Record<Permission, boolean>>;

/** The effective permissions of one membership. Owners ignore overrides. */
export function effectivePermissions(
  role: Role,
  overrides: PermissionOverrides = {},
): Set<Permission> {
  if (role === "owner") return new Set(ALL);
  const result = new Set(ROLE_DEFAULT_PERMISSIONS[role]);
  for (const permission of PERMISSIONS) {
    const value = overrides[permission];
    if (value === true) result.add(permission);
    if (value === false) result.delete(permission);
  }
  return result;
}

/** Approvers never see approval steps for their own actions (G1). */
export function isApprover(role: Role, overrides: PermissionOverrides = {}): boolean {
  return effectivePermissions(role, overrides).has("approve_items");
}
