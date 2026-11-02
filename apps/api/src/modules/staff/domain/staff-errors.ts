import type { STAFF_ERROR_CODES } from "@books/shared";
import { AppError } from "../../../common/errors/app-error";

type StaffErrorCode = (typeof STAFF_ERROR_CODES)[number];

const err = (status: number, code: StaffErrorCode, message: string, details?: unknown) =>
  new AppError(status, code, message, details);

/** Stable codes from STAFF_ERROR_CODES in @books/shared. */
export const StaffErrors = {
  /**
   * The phone or email already belongs to an account (any business, S1a review #1).
   * Deliberately says nothing about that account.
   */
  accountExists: () =>
    err(409, "account_exists", "This phone number or email already has an account"),
  lastOwner: () => err(409, "last_owner", "A business needs an owner; add another owner first"),
  cannotChangeSelf: () =>
    err(403, "cannot_change_self", "You cannot change your own role, switches or status"),
  locationRequired: () =>
    err(400, "location_required", "Staff who are not owners need at least one location"),
  memberNotFound: () => err(404, "member_not_found", "Staff member not found"),
  forbidden: (details?: unknown) =>
    err(403, "forbidden", "You are not allowed to do this", details),
  /**
   * The person also works in another business: their password and name are theirs,
   * not this business's, so this business cannot change them (reset, rename).
   */
  memberOfOtherBusiness: () => StaffErrors.forbidden({ reason: "member_of_other_business" }),
};
