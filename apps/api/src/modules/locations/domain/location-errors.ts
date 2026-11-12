import { AppError } from "../../../common/errors/app-error";

type LocationErrorCode =
  | "location_not_found"
  | "location_not_empty"
  | "location_closed"
  | "last_location"
  | "money_place_not_found"
  | "money_place_not_empty"
  | "invalid_settles_to"
  | "forbidden";

const err = (status: number, code: LocationErrorCode, message: string, details?: unknown) =>
  new AppError(status, code, message, details);

/** Stable codes from LOCATION_ERROR_CODES in @books/shared. */
export const LocationErrors = {
  /** 404 for the location in the path; 400 (with `details.locationIds`) for ids in a body. */
  locationNotFound: (status = 404, details?: { locationIds: string[] }) =>
    err(status, "location_not_found", "Location not found", details),
  /** `details` say what is left, e.g. `{ stockQuantity: 23, cashDrawerCents: 450000 }`. */
  locationNotEmpty: (details: LocationContents, showMoney = true) =>
    err(
      409,
      "location_not_empty",
      "Location still holds stock or cash",
      // The cash amount is shown only to people who may see money (see_cost_profit).
      showMoney ? details : { stockQuantity: details.stockQuantity },
    ),
  locationClosed: () => err(409, "location_closed", "Location is closed; reopen it first"),
  lastLocation: () =>
    err(409, "last_location", "A business needs at least one open location; add another first"),
  moneyPlaceNotFound: () => err(404, "money_place_not_found", "Money place not found"),
  moneyPlaceNotEmpty: (balanceCents: number, showMoney = true) =>
    err(
      409,
      "money_place_not_empty",
      "Money place balance is not zero",
      showMoney ? { balanceCents } : undefined,
    ),
  invalidSettlesTo: () =>
    err(400, "invalid_settles_to", "Money can only settle to a bank account of this business"),
  cashDrawerFixed: () =>
    err(403, "forbidden", "A cash drawer belongs to its location; only its name can change"),
};

/** What a location still holds; both must be zero to close it. */
export interface LocationContents {
  stockQuantity: number;
  cashDrawerCents: number;
}
