import { businessResponseSchema, type UpdateBusinessRequest } from "@books/shared";
import { apiRequest } from "@/lib/api";

/** Typed calls to /api/v1/business (F02 "Business details for documents"). */
export const businessApi = {
  get: () => apiRequest("/business", { schema: businessResponseSchema }),
  update: (body: UpdateBusinessRequest) =>
    apiRequest("/business", { method: "PUT", body, schema: businessResponseSchema }),
};
