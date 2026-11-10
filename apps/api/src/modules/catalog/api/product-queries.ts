import { PRODUCT_STATUSES } from "@books/shared";
import { z } from "zod";
import { decodeCursor } from "../application/list-products.use-case";

/**
 * Query strings of the read endpoints (the contract file describes them in prose).
 * `GET /products?q=&categoryId=&status=&limit=&cursor=`; `limit` defaults to 50, at most 100.
 */
export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .max(500)
    .transform((raw, ctx) => {
      const cursor = decodeCursor(raw);
      if (!cursor) ctx.addIssue({ code: "custom", message: "invalid_cursor" });
      return cursor ?? undefined;
    })
    .optional(),
});

export const waitingQuerySchema = productListQuerySchema.pick({ limit: true, cursor: true });

export const lookupQuerySchema = z.object({ barcode: z.string().trim().min(1).max(60) });
