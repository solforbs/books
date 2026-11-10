/**
 * Locations and money places (F02 §3, F11 §3.4). Requires a selected business.
 *
 * Locations, base /api/v1/locations:
 *   GET   /locations                 -> LocationsResponse   (members see the locations they are
 *                                                            assigned to; owners see all)
 *   POST  /locations                 -> LocationResponse    (manage_locations)
 *   PATCH /locations/:id             -> LocationResponse    (manage_locations)
 *   POST  /locations/:id/close       -> LocationResponse    (manage_locations)
 *   POST  /locations/:id/reopen      -> LocationResponse    (manage_locations)
 * Creating a location that can sell creates its cash drawer automatically; switching
 * "canSell" on later also creates one if missing. Closing is refused while the location
 * holds stock or its drawer is not zero (error `location_not_empty`, details list what);
 * until stock/cash exist (later slices) these checks report zero. Closed locations are
 * hidden, never deleted (G4). A business always keeps at least one open location
 * (`last_location`).
 *
 * Money places, base /api/v1/money-places:
 *   GET   /money-places              -> MoneyPlacesResponse (any member; filtered to their locations)
 *   POST  /money-places              -> MoneyPlaceResponse  (manage_locations)
 *   PATCH /money-places/:id          -> MoneyPlaceResponse  (manage_locations)
 * Cash drawers are created by the system (one per selling location) and cannot be created
 * by hand or linked to other locations. M-Pesa Till/Paybill, bank and safe places are
 * added once and linked to one or several locations (shared or separate, F02 §3).
 * Hiding a money place is allowed only when its balance is zero (balances arrive with F07/F11).
 */
import { z } from "zod";

export const LOCATION_TYPES = ["shop", "store"] as const;
export const PRICE_LISTS = ["retail", "wholesale"] as const;
export const LOCATION_STATUSES = ["open", "closed"] as const;

export const MONEY_PLACE_TYPES = [
  "cash_drawer",
  "mpesa_till",
  "mpesa_paybill",
  "bank",
  "safe",
] as const;
export type MoneyPlaceType = (typeof MONEY_PLACE_TYPES)[number];
/** Types a person may create; cash drawers are created by the system. */
export const CREATABLE_MONEY_PLACE_TYPES = ["mpesa_till", "mpesa_paybill", "bank", "safe"] as const;

const name = z.string().trim().min(2).max(60);
const ids = z.array(z.string().min(1)).max(50);

export const createLocationRequestSchema = z.object({
  name,
  type: z.enum(LOCATION_TYPES),
  /** Defaults: shops sell, stores don't (F02 §3). */
  canSell: z.boolean().optional(),
  priceList: z.enum(PRICE_LISTS).default("retail"),
});
export type CreateLocationRequest = z.input<typeof createLocationRequestSchema>;

export const updateLocationRequestSchema = z
  .object({ name, canSell: z.boolean(), priceList: z.enum(PRICE_LISTS) })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "nothing_to_update" });
export type UpdateLocationRequest = z.input<typeof updateLocationRequestSchema>;

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(LOCATION_TYPES),
  canSell: z.boolean(),
  priceList: z.enum(PRICE_LISTS),
  status: z.enum(LOCATION_STATUSES),
  /** The location's cash drawer, or null when it does not sell. */
  cashDrawerId: z.string().nullable(),
  createdAt: z.string(),
});
export type Location = z.infer<typeof locationSchema>;
export const locationResponseSchema = z.object({ location: locationSchema });
export const locationsResponseSchema = z.object({ locations: z.array(locationSchema) });
export type LocationResponse = z.infer<typeof locationResponseSchema>;
export type LocationsResponse = z.infer<typeof locationsResponseSchema>;

export const createMoneyPlaceRequestSchema = z.object({
  type: z.enum(CREATABLE_MONEY_PLACE_TYPES),
  name,
  /** Till number, Paybill number or bank account number; digits only for M-Pesa. */
  number: z.string().trim().max(40).optional(),
  /** Paybill "linked to a bank" (F02): money settles to this bank money place. */
  settlesToId: z.string().min(1).optional(),
  locationIds: ids.min(1, { error: "location_required" }),
});
export type CreateMoneyPlaceRequest = z.input<typeof createMoneyPlaceRequestSchema>;

export const updateMoneyPlaceRequestSchema = z
  .object({
    name,
    number: z.string().trim().max(40).nullable(),
    settlesToId: z.string().min(1).nullable(),
    locationIds: ids.min(1, { error: "location_required" }),
    hidden: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "nothing_to_update" });
export type UpdateMoneyPlaceRequest = z.input<typeof updateMoneyPlaceRequestSchema>;

export const moneyPlaceSchema = z.object({
  id: z.string(),
  type: z.enum(MONEY_PLACE_TYPES),
  name: z.string(),
  number: z.string().nullable(),
  settlesToId: z.string().nullable(),
  locationIds: z.array(z.string()),
  hidden: z.boolean(),
  createdAt: z.string(),
});
export type MoneyPlace = z.infer<typeof moneyPlaceSchema>;
export const moneyPlaceResponseSchema = z.object({ moneyPlace: moneyPlaceSchema });
export const moneyPlacesResponseSchema = z.object({ moneyPlaces: z.array(moneyPlaceSchema) });
export type MoneyPlaceResponse = z.infer<typeof moneyPlaceResponseSchema>;
export type MoneyPlacesResponse = z.infer<typeof moneyPlacesResponseSchema>;

export const LOCATION_ERROR_CODES = [
  "location_not_found",
  "location_not_empty",
  "location_closed",
  "last_location",
  "money_place_not_found",
  "money_place_not_empty",
  "invalid_settles_to",
  "forbidden",
] as const;
