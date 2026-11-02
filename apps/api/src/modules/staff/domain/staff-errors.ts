import { AppError } from "../../../common/errors/app-error";

type StaffErrorCode =
  | "already_member"
  | "last_owner"
  | "cannot_change_self"
  | "location_required"
  | "member_not_found"
  | "forbidden"
  | "identifier_taken";

const err = (status: number, code: StaffErrorCode, message: string, details?: unknown) =>
  new AppError(status, code, message, details);

/** Stable codes from STAFF_ERROR_CODES in @books/shared. */
export const StaffErrors = {
  alreadyMember: () => err(409, "already_member", "This person already works in this business"),
  lastOwner: () => err(409, "last_owner", "A business needs an owner; add another owner first"),
  cannotChangeSelf: () =>
    err(403, "cannot_change_self", "You cannot change your own role, switches or status"),
  locationRequired: () =>
    err(400, "location_required", "Staff who are not owners need at least one location"),
  memberNotFound: () => err(404, "member_not_found", "Staff member not found"),
  forbidden: (details?: unknown) =>
    err(403, "forbidden", "You are not allowed to do this", details),
  /** The phone belongs to one person and the email to another. */
  identifierTaken: () =>
    err(409, "identifier_taken", "Phone and email belong to two different people"),
};
