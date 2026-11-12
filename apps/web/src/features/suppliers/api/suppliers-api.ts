import {
  supplierResponseSchema,
  suppliersResponseSchema,
  type ApproveSupplierRequest,
  type CreateSupplierRequest,
  type QuickSupplierRequest,
  type UpdateSupplierRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

export interface SupplierListQuery {
  q?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

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
  apiRequest(path, { method: "POST", body: body ?? {}, schema: supplierResponseSchema });

/** Typed calls to /api/v1/suppliers (F03). */
export const suppliersApi = {
  list: (query: SupplierListQuery) =>
    apiRequest(`/suppliers${queryString({ ...query })}`, { schema: suppliersResponseSchema }),
  waiting: (query: Pick<SupplierListQuery, "limit" | "cursor"> = {}) =>
    apiRequest(`/suppliers/waiting${queryString({ ...query })}`, {
      schema: suppliersResponseSchema,
    }),
  get: (id: string) => apiRequest(`/suppliers/${enc(id)}`, { schema: supplierResponseSchema }),
  create: (body: CreateSupplierRequest) => post("/suppliers", body),
  quick: (body: QuickSupplierRequest) => post("/suppliers/quick", body),
  update: (id: string, body: UpdateSupplierRequest) =>
    apiRequest(`/suppliers/${enc(id)}`, {
      method: "PATCH",
      body,
      schema: supplierResponseSchema,
    }),
  approve: (id: string, body: ApproveSupplierRequest) =>
    post(`/suppliers/${enc(id)}/approve`, body),
  hide: (id: string) => post(`/suppliers/${enc(id)}/hide`),
  unhide: (id: string) => post(`/suppliers/${enc(id)}/unhide`),
};
