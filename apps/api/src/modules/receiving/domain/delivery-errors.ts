import { AppError, badRequest, forbidden } from "../../../common/errors/app-error";

/**
 * Stable codes: DELIVERY_ERROR_CODES in @books/shared. A few references in the body reuse
 * codes of other contracts (`supplier_not_found`, `product_not_found`, `money_place_not_found`),
 * answered as 400 because the id is in the request body, not in the path.
 */
const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export const DeliveryErrors = {
  notFound: () => new AppError(404, "delivery_not_found", "Delivery not found"),
  lineNotFound: (lineId: string) =>
    new AppError(404, "line_not_found", "This line is not part of the delivery", { lineId }),
  commandConflict: () =>
    conflict("command_conflict", "This command id was already used for a different request"),
  supplierNotFound: () => badRequest("supplier_not_found", "Supplier not found"),
  supplierCurrency: () =>
    badRequest(
      "supplier_currency_not_supported",
      "Deliveries from suppliers paid in US dollars are not available yet",
    ),
  productNotFound: (productId: string) =>
    badRequest("product_not_found", "Product not found", { productId }),
  productNotReceivable: (productId: string, status: string) =>
    badRequest("product_not_receivable", "This product cannot be received", { productId, status }),
  invalidPackUnit: (productId: string, packUnitId: string) =>
    badRequest("invalid_pack_unit", "This pack unit cannot be used for this product", {
      productId,
      packUnitId,
    }),
  invalidImei: (details: { value: string; reason: string; productId: string }) =>
    badRequest("invalid_imei", "This is not a valid IMEI or serial number", details),
  duplicateInDelivery: (number: string) =>
    badRequest("duplicate_imei_in_delivery", "The same number appears twice", { number }),
  /** Details are exactly what the app shows: the number and the place it is in (F04 T8). */
  imeiInStock: (details: { imei: string; locationName?: string }) =>
    conflict("imei_in_stock", "This number is already in stock", details),
  imeiSoldBefore: (details: { imei: string }) =>
    conflict(
      "imei_sold_before",
      "This number was sold before; an owner or manager must confirm",
      details,
    ),
  quantityTooLarge: (details: { max: number }) =>
    badRequest(
      "quantity_too_large",
      "This is too many pieces or numbers for one delivery",
      details,
    ),
  imeiCountMismatch: (details: { productId: string; pieces: number; units: number }) =>
    badRequest("imei_count_mismatch", "The number of IMEIs does not match the quantity", details),
  unitsNotAllowed: (productId: string) =>
    badRequest("units_not_allowed", "This product takes no IMEI or serial numbers like this", {
      productId,
    }),
  paymentExceedsTotal: (totalCents: number, paidCents: number) =>
    badRequest("payment_exceeds_total", "The payments are more than the known total", {
      totalCents,
      paidCents,
    }),
  insufficientFunds: (moneyPlaceId: string) =>
    conflict("insufficient_funds", "There is not enough money in this place", { moneyPlaceId }),
  costAlreadyKnown: (lineId: string) =>
    conflict("cost_already_known", "The cost of this line is already known", { lineId }),
  moneyPlaceNotFound: (moneyPlaceId: string) =>
    badRequest("money_place_not_found", "Money place not found", { moneyPlaceId }),
  duplicateLine: () =>
    badRequest("validation_failed", "Request validation failed", [
      { path: "lines", message: "duplicate_line" },
    ]),
  forbidden: () => forbidden("forbidden", "You are not allowed to do this"),
};
