import {
  categoriesResponseSchema,
  categoryResponseSchema,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

/** Typed calls to /api/v1/product-categories (F01 §4). */
export const categoriesApi = {
  list: () => apiRequest("/product-categories", { schema: categoriesResponseSchema }),
  create: (body: CreateCategoryRequest) =>
    apiRequest("/product-categories", { method: "POST", body, schema: categoryResponseSchema }),
  update: (id: string, body: UpdateCategoryRequest) =>
    apiRequest(`/product-categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
      schema: categoryResponseSchema,
    }),
};
