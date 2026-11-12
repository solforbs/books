import {
  deliveriesResponseSchema,
  deliveryResponseSchema,
  type CompleteUnitsRequest,
  type CreateDeliveryRequest,
  type EnterCostsRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

export interface DeliveryListQuery {
  supplierId?: string | undefined;
  locationId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
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
const post = (path: string, body: unknown) =>
  apiRequest(path, { method: "POST", body, schema: deliveryResponseSchema });

/** Typed calls to /api/v1/deliveries (F04a). */
export const deliveriesApi = {
  list: (query: DeliveryListQuery) =>
    apiRequest(`/deliveries${queryString({ ...query })}`, { schema: deliveriesResponseSchema }),
  get: (id: string) => apiRequest(`/deliveries/${enc(id)}`, { schema: deliveryResponseSchema }),
  create: (body: CreateDeliveryRequest) => post("/deliveries", body),
  enterCosts: (id: string, body: EnterCostsRequest) => post(`/deliveries/${enc(id)}/costs`, body),
  completeUnits: (id: string, body: CompleteUnitsRequest) =>
    post(`/deliveries/${enc(id)}/units`, body),
};
