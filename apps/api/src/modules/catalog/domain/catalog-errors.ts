import { AppError, badRequest } from "../../../common/errors/app-error";

/**
 * Stable codes: PRODUCT_ERROR_CODES and CATEGORY_ERROR_CODES in @books/shared, plus
 * `pack_not_found`, `barcode_not_found`, `pack_exists` and `product_closed`, which only this module raises.
 */
const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export interface Usage {
  stockQuantity: number;
  saleCount: number;
}

export const CatalogErrors = {
  productNotFound: () => new AppError(404, "product_not_found", "Product not found"),
  packNotFound: () => new AppError(404, "pack_not_found", "Pack unit not found on this product"),
  barcodeNotFound: () =>
    new AppError(404, "barcode_not_found", "Barcode not found on this product"),
  categoryNotFound: (status: 400 | 404 = 404) =>
    new AppError(status, "category_not_found", "Category not found"),
  categoryExists: () => conflict("category_exists", "A category with this name already exists"),
  categoryInUse: (productCount: number) =>
    conflict("category_in_use", "Move or hide its products first", { productCount }),
  duplicateProduct: (existingId: string, existingName: string) =>
    conflict("duplicate_product", "This product already exists", { existingId, existingName }),
  barcodeInUse: (barcode: string, productId: string, productName: string) =>
    conflict("barcode_in_use", "This barcode belongs to another product", {
      barcode,
      productId,
      productName,
    }),
  similarProducts: (products: unknown[]) =>
    conflict("similar_products", "Similar products exist; confirm they are different", {
      products,
    }),
  packsNotAllowed: () =>
    conflict("packs_not_allowed", "Phones, tablets and serial products are sold one by one"),
  packExists: () => conflict("pack_exists", "A pack with this name already exists"),
  productInUse: (usage: Usage) =>
    conflict("product_in_use", "This product already has stock or sales", usage),
  productHasStock: (stockQuantity: number) =>
    conflict("product_has_stock", "Sell, move or adjust the stock first", { stockQuantity }),
  invalidBarcode: (reason: string) =>
    badRequest("invalid_barcode", "This is not a usable barcode", { reason }),
  notWaiting: () => conflict("not_waiting", "Only a waiting product can be decided"),
  invalidMergeTarget: (reason: string) =>
    conflict("invalid_merge_target", "Choose another active product to merge into", { reason }),
  productClosed: () => conflict("product_closed", "This product was merged or rejected"),
  /** Validation-shaped, so the web app can show it under the field. */
  fieldRequired: (path: string, message = "required") =>
    badRequest("validation_failed", "Request validation failed", [{ path, message }]),
};
