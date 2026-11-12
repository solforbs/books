import { z } from "zod";
import { badRequest } from "../../../common/errors/app-error";
import { decodeDeliveryCursor } from "../application/list-deliveries.use-case";

/**
 * `GET /deliveries?supplierId=&locationId=&from=&to=&limit=&cursor=`: dates are calendar
 * dates (YYYY-MM-DD, Kenya time, inclusive); `limit` defaults to 50, at most 100.
 */
export const deliveryListQuerySchema = z.object({
  supplierId: z.uuid().optional(),
  locationId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .max(200)
    .transform((raw) => {
      const number = decodeDeliveryCursor(raw);
      if (number === null) throw badRequest("invalid_cursor", "This page marker is not valid");
      return number;
    })
    .optional(),
});
