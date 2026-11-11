/**
 * Products (F01). Requires a selected business. Money is integer cents (never floats).
 * Base path: /api/v1/products
 *
 *   GET   /products                    -> ProductsResponse   (any member; query: q, categoryId,
 *                                         status, limit<=100, cursor). `q` matches name, model,
 *                                         brand and barcodes. Hidden/merged/rejected products are
 *                                         returned only when `status` asks for them.
 *   GET   /products/options            -> ProductOptionsResponse (suggestions for typing)
 *   GET   /products/lookup?barcode=    -> ProductsResponse   (scan: every ACTIVE or WAITING product
 *                                         carrying that code; several only when they differ in
 *                                         condition alone)
 *   GET   /products/waiting            -> ProductsResponse   (permission: approve_items)
 *   GET   /products/:id                -> ProductResponse
 *   POST  /products/check              -> CheckProductResponse  (dry run of the duplicate checks)
 *   POST  /products                    -> ProductResponse 201 (permission: add_products)
 *   POST  /products/bulk               -> BulkCreateResponse (permission: add_products; "create
 *                                         several at once": the web app expands storage x colour x
 *                                         condition into rows; each row is checked and created on
 *                                         its own, results are per row)
 *   PATCH /products/:id                -> ProductResponse    (manage_products; price fields also
 *                                         need set_prices)
 *   POST  /products/:id/hide | /unhide -> ProductResponse    (manage_products)
 *   POST  /products/:id/approve        -> ProductResponse    (approve_items; optional fixes in body)
 *   POST  /products/:id/merge          -> ProductResponse    (approve_items; body {intoProductId})
 *   POST  /products/:id/reject         -> ProductResponse    (approve_items)
 *   POST  /products/:id/barcodes       -> ProductResponse    (manage_products): add a barcode
 *   POST  /products/:id/barcodes/generate -> ProductResponse (manage_products or add_products on
 *                                         own waiting product): a unique shop barcode
 *   POST  /products/:id/barcodes/:barcodeId/retire -> ProductResponse (manage_products)
 *   POST  /products/:id/packs          -> ProductResponse    (manage_products): add a pack unit
 *   POST  /products/:id/packs/:packId/retire -> ProductResponse (manage_products)
 *   GET   /products/:id/history        -> ProductHistoryResponse (manage_products)
 *
 * Rules (summary; the spec F01 has the full list):
 * - Status on creation: `active` when the creator is an approver (owner, or a person with
 *   approve_items), otherwise `waiting` (G1: solo shops never see waiting products). Waiting
 *   products can be received and sold; they only need an approver's decision.
 * - Exact duplicate (same brand+model+storage+colour+condition after cleaning) -> 409
 *   `duplicate_product` (details.existingId). Same non-condition-sharing barcode -> 409
 *   `barcode_in_use` (details.productId). Similar names/models -> 409 `similar_products`
 *   (details.products) unless the request sets `acknowledgeSimilar: true`.
 * - A manufacturer barcode may be shared only by products that differ in condition alone
 *   (same brand, model, storage, colour); anything else is `barcode_in_use`. Shop barcodes
 *   belong to exactly one product/pack.
 * - Pack units are not allowed on imei/serial products (`packs_not_allowed`).
 * - Tracking type, base unit and a used pack's size cannot change once the product has stock or
 *   sales (`product_in_use`); there is no stock yet, so this is an extension point that reports
 *   "not in use" for now.
 * - Hiding is refused while stock remains (`product_has_stock`; extension point, zero for now).
 * - Reject is allowed only without stock/sales (`product_in_use`); otherwise merge. Merge moves
 *   barcodes to the target, marks the source `merged` (mergedIntoId), and cannot be undone.
 * - Nothing is deleted (G4); every change writes history (who, when, field, before, after).
 * - Cost is never part of this contract (see_cost_profit, F04).
 */
import { z } from "zod";

export const TRACKING_TYPES = ["imei", "serial", "quantity"] as const;
export type TrackingType = (typeof TRACKING_TYPES)[number];
export const PRODUCT_STATUSES = ["waiting", "active", "hidden", "merged", "rejected"] as const;
export const VAT_TYPES = ["standard", "exempt", "zero_rated"] as const;
export const BARCODE_KINDS = ["manufacturer", "shop"] as const;
/** Starter values for the condition suggestions (F01 §4). */
export const STARTER_CONDITIONS = ["New", "Ex-UK", "Refurbished", "Used"] as const;

const cents = z.number().int().nonnegative().max(100_000_000_000);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => text(max).nullable().optional();

export const packUnitInputSchema = z.object({
  name: text(30),
  /** How many base units are in one pack (box of 10 -> 10). */
  size: z.number().int().min(2).max(100_000),
  wholesalePrice: cents.nullable().optional(),
  retailPrice: cents.nullable().optional(),
});
export type PackUnitInput = z.input<typeof packUnitInputSchema>;

export const locationPriceInputSchema = z.object({
  locationId: z.string().min(1),
  retailPrice: cents.nullable().optional(),
  wholesalePrice: cents.nullable().optional(),
});

export const createProductRequestSchema = z
  .object({
    categoryId: z.string().min(1),
    /** Required unless the category's naming mode is "parts" (then it is built from parts). */
    name: text(150).optional(),
    brand: optionalText(60),
    model: optionalText(80),
    storage: optionalText(30),
    colour: optionalText(30),
    condition: optionalText(30),
    trackingType: z.enum(TRACKING_TYPES).optional(),
    baseUnit: text(20).default("piece"),
    packUnits: z.array(packUnitInputSchema).max(5).default([]),
    /** Manufacturer barcodes typed or scanned; shop barcodes are generated afterwards. */
    barcodes: z.array(text(40)).max(10).default([]),
    retailPrice: cents.nullable().optional(),
    wholesalePrice: cents.nullable().optional(),
    minPrice: cents.nullable().optional(),
    locationPrices: z.array(locationPriceInputSchema).max(50).default([]),
    /** Only meaningful when the business has VAT switched on; ignored otherwise. */
    vatType: z.enum(VAT_TYPES).nullable().optional(),
    canBeGivenFree: z.boolean().default(false),
    warrantyMonths: z.number().int().min(1).max(120).nullable().optional(),
    acknowledgeSimilar: z.boolean().default(false),
    /** How it was added, for the audit trail (F01 §8). */
    source: z.enum(["form", "bulk", "quick_add", "import"]).default("form"),
    /**
     * The shop or store the person was working in (the location switcher). Recorded in the
     * product's history and audit entry (F01 §8: who, when, where, how). Must be an open
     * location the person may use (400 `location_not_found` otherwise). The device is
     * recorded later, with the device features.
     */
    locationId: z.string().min(1).optional(),
  })
  .refine((d) => d.name || d.model, { message: "name_required", path: ["name"] });
export type CreateProductRequest = z.input<typeof createProductRequestSchema>;

export const updateProductRequestSchema = z
  .object({
    name: text(150),
    categoryId: z.string().min(1),
    brand: optionalText(60),
    model: optionalText(80),
    storage: optionalText(30),
    colour: optionalText(30),
    condition: optionalText(30),
    trackingType: z.enum(TRACKING_TYPES),
    baseUnit: text(20),
    retailPrice: cents.nullable(),
    wholesalePrice: cents.nullable(),
    minPrice: cents.nullable(),
    locationPrices: z.array(locationPriceInputSchema).max(50),
    vatType: z.enum(VAT_TYPES).nullable(),
    canBeGivenFree: z.boolean(),
    warrantyMonths: z.number().int().min(1).max(120).nullable(),
    acknowledgeSimilar: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "nothing_to_update" });
export type UpdateProductRequest = z.input<typeof updateProductRequestSchema>;

export const addBarcodeRequestSchema = z.object({
  value: text(40),
  packUnitId: z.string().min(1).optional(),
});
export const generateBarcodeRequestSchema = z.object({ packUnitId: z.string().min(1).optional() });
export const mergeProductRequestSchema = z.object({ intoProductId: z.string().min(1) });
/** Approve may fix things first (F01 §8): same fields as update, all optional. */
export const approveProductRequestSchema = updateProductRequestSchema.or(z.object({}));

export const productBarcodeSchema = z.object({
  id: z.string(),
  value: z.string(),
  kind: z.enum(BARCODE_KINDS),
  packUnitId: z.string().nullable(),
  active: z.boolean(),
});
export const packUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().int(),
  wholesalePrice: z.number().int().nullable(),
  retailPrice: z.number().int().nullable(),
  active: z.boolean(),
});
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  storage: z.string().nullable(),
  colour: z.string().nullable(),
  condition: z.string().nullable(),
  trackingType: z.enum(TRACKING_TYPES),
  baseUnit: z.string(),
  packUnits: z.array(packUnitSchema),
  barcodes: z.array(productBarcodeSchema),
  retailPrice: z.number().int().nullable(),
  wholesalePrice: z.number().int().nullable(),
  minPrice: z.number().int().nullable(),
  locationPrices: z.array(
    z.object({
      locationId: z.string(),
      retailPrice: z.number().int().nullable(),
      wholesalePrice: z.number().int().nullable(),
    }),
  ),
  vatType: z.enum(VAT_TYPES).nullable(),
  canBeGivenFree: z.boolean(),
  warrantyMonths: z.number().int().nullable(),
  status: z.enum(PRODUCT_STATUSES),
  mergedIntoId: z.string().nullable(),
  addedBy: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
});
export type Product = z.infer<typeof productSchema>;
export const productResponseSchema = z.object({ product: productSchema });
export const productsResponseSchema = z.object({
  products: z.array(productSchema),
  nextCursor: z.string().nullable(),
});
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;

export const checkProductResponseSchema = z.object({
  exactDuplicate: productSchema.nullable(),
  similar: z.array(productSchema),
  barcodeClashes: z.array(z.object({ barcode: z.string(), product: productSchema })),
  /** The name that would be saved (built from parts for "parts" categories). */
  name: z.string(),
});
export type CheckProductResponse = z.infer<typeof checkProductResponseSchema>;

export const bulkCreateRequestSchema = z.object({
  items: z.array(createProductRequestSchema).min(1).max(100),
});
export type BulkCreateRequest = z.input<typeof bulkCreateRequestSchema>;
export const bulkCreateResponseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      product: productSchema.nullable(),
      error: z.object({ code: z.string(), details: z.unknown().optional() }).nullable(),
    }),
  ),
});
export type BulkCreateResponse = z.infer<typeof bulkCreateResponseSchema>;

export const productOptionsResponseSchema = z.object({
  brands: z.array(z.string()),
  models: z.array(z.object({ brand: z.string().nullable(), model: z.string() })),
  storages: z.array(z.string()),
  colours: z.array(z.string()),
  conditions: z.array(z.string()),
});
export type ProductOptionsResponse = z.infer<typeof productOptionsResponseSchema>;

export const productHistoryResponseSchema = z.object({
  entries: z.array(
    z.object({
      at: z.string(),
      by: z.object({ id: z.string(), name: z.string() }),
      action: z.string(),
      field: z.string().nullable(),
      before: z.unknown().nullable(),
      after: z.unknown().nullable(),
    }),
  ),
});
export type ProductHistoryResponse = z.infer<typeof productHistoryResponseSchema>;

export const PRODUCT_ERROR_CODES = [
  "product_not_found",
  "duplicate_product",
  "barcode_in_use",
  "similar_products",
  "packs_not_allowed",
  "product_in_use",
  "product_has_stock",
  "invalid_barcode",
  "not_waiting",
  "invalid_merge_target",
  "forbidden",
] as const;
