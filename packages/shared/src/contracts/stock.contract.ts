/**
 * Stock on hand (read only), F04a. Requires a selected business. Base path: /api/v1/stock
 *
 *   GET /stock               -> StockResponse        (permission: receive_stock, manage_products or
 *        view_reports; query: locationId, categoryId, q (product name/brand/model/barcode), limit<=100,
 *        cursor; one row per product and location with stock or incomplete units, alphabetical;
 *        people limited to some locations only see those locations)
 *   GET /stock/lookup?number=  -> UnitLookupResponse (same permissions): find a phone or other
 *        serialised item by IMEI (either of its two) or serial; returns every unit with that number
 *        in the business, any status, newest first (an IMEI that came back can appear twice)
 *
 * Stock on hand is calculated from the cost layers and units (ARCH-02), never typed. Value and cost
 * fields are null for people without `see_cost_profit`.
 */
import { z } from "zod";
import { UNIT_STATUSES } from "./deliveries.contract";

export const stockRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  categoryId: z.string(),
  trackingType: z.enum(["imei", "serial", "quantity"]),
  locationId: z.string(),
  locationName: z.string(),
  /** Pieces in stock (IMEI/serial units counted when their status is in_stock and complete). */
  onHand: z.number().int(),
  /** Units received without their IMEI/serial yet (cannot be sold). */
  incomplete: z.number().int().nonnegative(),
  /** Pieces whose cost is not known yet (price pending or cost missing). */
  costMissing: z.number().int().nonnegative(),
  /** Value at cost of the pieces whose cost is known; null without see_cost_profit. */
  valueCents: z.number().int().nullable(),
});
export type StockRow = z.infer<typeof stockRowSchema>;
export const stockResponseSchema = z.object({
  rows: z.array(stockRowSchema),
  nextCursor: z.string().nullable(),
});
export type StockResponse = z.infer<typeof stockResponseSchema>;

export const stockUnitSchema = z.object({
  id: z.string(),
  imei: z.string().nullable(),
  imei2: z.string().nullable(),
  serial: z.string().nullable(),
  status: z.enum(UNIT_STATUSES),
  product: z.object({ id: z.string(), name: z.string() }),
  location: z.object({ id: z.string(), name: z.string() }),
  deliveryId: z.string(),
  deliveryNumber: z.number().int(),
  receivedAt: z.string(),
  costCents: z.number().int().nullable(),
});
export type StockUnit = z.infer<typeof stockUnitSchema>;
export const unitLookupResponseSchema = z.object({ units: z.array(stockUnitSchema) });
export type UnitLookupResponse = z.infer<typeof unitLookupResponseSchema>;

export const STOCK_ERROR_CODES = ["invalid_cursor", "forbidden"] as const;
