import {
  locationResponseSchema,
  locationsResponseSchema,
  moneyPlaceResponseSchema,
  moneyPlacesResponseSchema,
  type CreateLocationRequest,
  type CreateMoneyPlaceRequest,
  type UpdateLocationRequest,
  type UpdateMoneyPlaceRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

/** Typed calls to /api/v1/locations (F02 §3). */
export const locationsApi = {
  list: () => apiRequest("/locations", { schema: locationsResponseSchema }),
  create: (body: CreateLocationRequest) =>
    apiRequest("/locations", { method: "POST", body, schema: locationResponseSchema }),
  update: (id: string, body: UpdateLocationRequest) =>
    apiRequest(`/locations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
      schema: locationResponseSchema,
    }),
  close: (id: string) =>
    apiRequest(`/locations/${encodeURIComponent(id)}/close`, {
      method: "POST",
      schema: locationResponseSchema,
    }),
  reopen: (id: string) =>
    apiRequest(`/locations/${encodeURIComponent(id)}/reopen`, {
      method: "POST",
      schema: locationResponseSchema,
    }),
};

/** Typed calls to /api/v1/money-places (F02 §3, F11 §3.4). */
export const moneyPlacesApi = {
  list: () => apiRequest("/money-places", { schema: moneyPlacesResponseSchema }),
  create: (body: CreateMoneyPlaceRequest) =>
    apiRequest("/money-places", { method: "POST", body, schema: moneyPlaceResponseSchema }),
  update: (id: string, body: UpdateMoneyPlaceRequest) =>
    apiRequest(`/money-places/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
      schema: moneyPlaceResponseSchema,
    }),
};
