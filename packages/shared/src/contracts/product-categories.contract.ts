/**
 * Product categories (F01 §4: "Owner's own list, no ready-made list"). Requires a selected
 * business. Base path: /api/v1/product-categories
 *   GET   /product-categories        -> CategoriesResponse (any member; hidden ones only for
 *                                       users with manage_products)
 *   POST  /product-categories        -> CategoryResponse   (permission: manage_products)
 *   PATCH /product-categories/:id    -> CategoryResponse   (permission: manage_products)
 * A category has a default tracking type (new products start with it; Phones -> imei) and a
 * naming mode: "parts" builds names from brand + model + storage + colour + condition
 * (phones, laptops), "free" means the name is typed. Names are unique per business
 * (case-insensitive, 409 `category_exists`). Categories are hidden, never deleted (G4); a
 * category that still has active products cannot be hidden (409 `category_in_use`).
 */
import { z } from "zod";
import { TRACKING_TYPES } from "./products.contract";

export const NAMING_MODES = ["parts", "free"] as const;

const categoryName = z.string().trim().min(2).max(60);

export const createCategoryRequestSchema = z.object({
  name: categoryName,
  defaultTracking: z.enum(TRACKING_TYPES).default("quantity"),
  namingMode: z.enum(NAMING_MODES).default("free"),
});
export type CreateCategoryRequest = z.input<typeof createCategoryRequestSchema>;

export const updateCategoryRequestSchema = z
  .object({
    name: categoryName,
    defaultTracking: z.enum(TRACKING_TYPES),
    namingMode: z.enum(NAMING_MODES),
    hidden: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "nothing_to_update" });
export type UpdateCategoryRequest = z.input<typeof updateCategoryRequestSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultTracking: z.enum(TRACKING_TYPES),
  namingMode: z.enum(NAMING_MODES),
  hidden: z.boolean(),
  /** Number of active products; used by the UI to explain why hiding is refused. */
  productCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;
export const categoryResponseSchema = z.object({ category: categorySchema });
export const categoriesResponseSchema = z.object({ categories: z.array(categorySchema) });
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export const CATEGORY_ERROR_CODES = [
  "category_exists",
  "category_in_use",
  "category_not_found",
] as const;
