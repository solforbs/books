import {
  bulkCreateResponseSchema,
  checkProductResponseSchema,
  productHistoryResponseSchema,
  productOptionsResponseSchema,
  productResponseSchema,
  productsResponseSchema,
  type BulkCreateRequest,
  type CreateProductRequest,
  type UpdateProductRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

export interface ProductListQuery {
  q?: string | undefined;
  categoryId?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

/** Builds "?a=1&b=2" from the given values, leaving out empty ones. */
function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const enc = encodeURIComponent;
const post = (path: string, body?: unknown) =>
  apiRequest(path, { method: "POST", body: body ?? {}, schema: productResponseSchema });

/** Typed calls to /api/v1/products (F01). Cost is never part of these shapes. */
export const productsApi = {
  list: (query: ProductListQuery) =>
    apiRequest(`/products${queryString({ ...query })}`, { schema: productsResponseSchema }),
  waiting: (query: { cursor?: string; limit?: number } = {}) =>
    apiRequest(`/products/waiting${queryString({ ...query })}`, {
      schema: productsResponseSchema,
    }),
  lookup: (barcode: string) =>
    apiRequest(`/products/lookup${queryString({ barcode })}`, { schema: productsResponseSchema }),
  options: () => apiRequest("/products/options", { schema: productOptionsResponseSchema }),
  get: (id: string) => apiRequest(`/products/${enc(id)}`, { schema: productResponseSchema }),
  history: (id: string) =>
    apiRequest(`/products/${enc(id)}/history`, { schema: productHistoryResponseSchema }),
  check: (body: CreateProductRequest) =>
    apiRequest("/products/check", { method: "POST", body, schema: checkProductResponseSchema }),
  create: (body: CreateProductRequest) =>
    apiRequest("/products", { method: "POST", body, schema: productResponseSchema }),
  bulk: (body: BulkCreateRequest) =>
    apiRequest("/products/bulk", { method: "POST", body, schema: bulkCreateResponseSchema }),
  update: (id: string, body: UpdateProductRequest) =>
    apiRequest(`/products/${enc(id)}`, { method: "PATCH", body, schema: productResponseSchema }),
  hide: (id: string) => post(`/products/${enc(id)}/hide`),
  unhide: (id: string) => post(`/products/${enc(id)}/unhide`),
  approve: (id: string, body: UpdateProductRequest = {}) =>
    post(`/products/${enc(id)}/approve`, body),
  merge: (id: string, intoProductId: string) =>
    post(`/products/${enc(id)}/merge`, { intoProductId }),
  reject: (id: string) => post(`/products/${enc(id)}/reject`),
  addBarcode: (id: string, value: string) => post(`/products/${enc(id)}/barcodes`, { value }),
  generateBarcode: (id: string) => post(`/products/${enc(id)}/barcodes/generate`),
  retireBarcode: (id: string, barcodeId: string) =>
    post(`/products/${enc(id)}/barcodes/${enc(barcodeId)}/retire`),
  addPack: (id: string, body: { name: string; size: number }) =>
    post(`/products/${enc(id)}/packs`, body),
  retirePack: (id: string, packId: string) =>
    post(`/products/${enc(id)}/packs/${enc(packId)}/retire`),
};
