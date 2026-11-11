import { SUPPLIER_STATUSES } from "@books/shared";
import { z } from "zod";
import { decodeCursor } from "../application/list-suppliers.use-case";

/**
 * Query strings of the list endpoints (the contract file describes them in prose).
 * `GET /suppliers?q=&status=&neighbour=true&limit=&cursor=`; `limit` defaults to 50, at most 100.
 */
export const supplierListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(SUPPLIER_STATUSES).optional(),
  // Only `neighbour=true` filters; anything else is refused rather than guessed at.
  neighbour: z
    .literal("true")
    .transform(() => true)
    .optional()
    .transform((v) => v ?? false),
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

export const waitingSuppliersQuerySchema = supplierListQuerySchema.pick({
  limit: true,
  cursor: true,
});
