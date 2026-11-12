import { effectivePermissions } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { seesAllLocations } from "../../identity/domain/auth-context";

/**
 * Which locations a member may see and act on: owners every location (null =
 * no limit), everyone else only the ones they are assigned to (F02 §4.3, T10).
 */
export type LocationScope = ReadonlySet<string> | null;

export function locationScopeOf(access: TenantAccessContext): LocationScope {
  return seesAllLocations(access) ? null : new Set(access.locationIds);
}

export function inScope(scope: LocationScope, locationId: string): boolean {
  return scope === null || scope.has(locationId);
}

/** Keeps only the ids the scope allows (all of them for owners). */
export function visibleIds(scope: LocationScope, ids: string[]): string[] {
  return scope === null ? ids : ids.filter((id) => scope.has(id));
}

/** Location types that sell by default (F02 §3: shops sell, stores don't). */
export function defaultCanSell(type: "shop" | "store"): boolean {
  return type === "shop";
}

const DIGITS = /^\d{4,12}$/;

/** M-Pesa Till and Paybill numbers are digits only. */
export function isValidMoneyPlaceNumber(type: string, value: string | null | undefined): boolean {
  if (!value) return true;
  return type === "mpesa_till" || type === "mpesa_paybill" ? DIGITS.test(value) : true;
}

/** Only M-Pesa places settle to a bank (F02: "Paybill linked to a bank"). */
export function canSettle(type: string): boolean {
  return type === "mpesa_till" || type === "mpesa_paybill";
}

/** Balances and costs are only shown to people with see_cost_profit. */
export function canSeeMoney(access: TenantAccessContext): boolean {
  return effectivePermissions(access.role, access.permissionOverrides).has("see_cost_profit");
}
