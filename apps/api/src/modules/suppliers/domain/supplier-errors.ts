import { AppError, badRequest, forbidden } from "../../../common/errors/app-error";

/** Stable codes: SUPPLIER_ERROR_CODES in @books/shared. */
const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export const SupplierErrors = {
  notFound: () => new AppError(404, "supplier_not_found", "Supplier not found"),
  phoneExists: (existingId: string, existingName: string) =>
    conflict("supplier_phone_exists", "Another supplier already has this phone number", {
      existingId,
      existingName,
    }),
  similar: (suppliers: unknown[]) =>
    conflict("similar_suppliers", "Similar suppliers exist; confirm they are different", {
      suppliers,
    }),
  hasBalance: (balance: number) =>
    conflict("supplier_has_balance", "Settle the balance with this supplier first", { balance }),
  useFullForm: () =>
    badRequest("use_full_form", "People who can manage suppliers add them with the full form"),
  notWaiting: () => conflict("not_waiting", "Only a waiting supplier can be approved"),
  phoneRequired: () => badRequest("phone_required", "A phone number is needed to approve"),
  forbidden: () => forbidden("forbidden", "You are not allowed to do this"),
};
