import {
  PERMISSIONS,
  effectivePermissions,
  type Location,
  type MoneyPlace,
  type MyAccessResponse,
  type Role,
  type StaffMember,
} from "@books/shared";
import type { Routes } from "./mock-fetch";

export function makeAccess(overrides: Partial<MyAccessResponse> = {}): MyAccessResponse {
  return {
    role: "owner",
    locationIds: [],
    permissions: [...PERMISSIONS],
    approvalsActive: false,
    ...overrides,
  };
}

/** Effective permissions of a role without per-person switches. */
export function accessFor(role: Role, locationIds: string[] = ["l1"]): MyAccessResponse {
  return makeAccess({ role, locationIds, permissions: [...effectivePermissions(role)] });
}

export function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "l1",
    name: "Luthuli Shop 1",
    type: "shop",
    canSell: true,
    priceList: "retail",
    status: "open",
    cashDrawerId: "mp-drawer-l1",
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

export function makeMoneyPlace(overrides: Partial<MoneyPlace> = {}): MoneyPlace {
  return {
    id: "mp-drawer-l1",
    type: "cash_drawer",
    name: "Luthuli Shop 1 cash",
    number: null,
    settlesToId: null,
    locationIds: ["l1"],
    hidden: false,
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

export function makeMember(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    membershipId: "m1",
    userId: "u1",
    name: "Amina Hassan",
    phone: "+254712345678",
    email: null,
    role: "owner",
    locationIds: [],
    permissions: {},
    status: "active",
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

/**
 * What a logged-in owner of a one-shop business sees after login. `mockFetch` falls back to
 * these, so auth tests that reach the home screen need not list them.
 */
export function defaultShopRoutes(): Routes {
  return {
    "GET /me/permissions": { body: makeAccess() },
    "GET /locations": { body: { locations: [makeLocation()] } },
  };
}
