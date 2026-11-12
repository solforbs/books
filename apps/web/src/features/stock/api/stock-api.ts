import { stockResponseSchema, unitLookupResponseSchema } from "@books/shared";
import { apiRequest } from "@/lib/api";

export interface StockQuery {
  locationId?: string | undefined;
  categoryId?: string | undefined;
  q?: string | undefined;
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

/** Typed calls to /api/v1/stock (F04a, read only). */
export const stockApi = {
  list: (query: StockQuery) =>
    apiRequest(`/stock${queryString({ ...query })}`, { schema: stockResponseSchema }),
  lookup: (number: string) =>
    apiRequest(`/stock/lookup${queryString({ number })}`, { schema: unitLookupResponseSchema }),
};
