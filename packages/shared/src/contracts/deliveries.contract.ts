/**
 * Receiving stock, first part (F04a; plan in research/features/F04a-receiving-core.md,
 * design in research/architecture/ARCH-02-inventory-ledger.md). Requires a selected business.
 * Money is integer cents. Base path: /api/v1/deliveries
 *
 *   POST /deliveries                  -> DeliveryResponse 201 (permission: receive_stock). Saves a
 *        whole delivery in ONE transaction: stock layers, units (IMEI/serial), movements and
 *        ledger entries (inventory value, supplier debt, money places).
 *   GET  /deliveries                  -> DeliveriesResponse (receive_stock; query: supplierId,
 *        locationId, from, to (dates), limit<=100, cursor; newest first)
 *   GET  /deliveries/:id              -> DeliveryResponse   (receive_stock)
 *   POST /deliveries/:id/costs        -> DeliveryResponse   (see_cost_profit): enter the cost of
 *        lines that were received with "price pending" / "cost to be added"
 *   POST /deliveries/:id/units        -> DeliveryResponse   (receive_stock): complete the missing
 *        IMEIs/serials of a delivery that was saved as incomplete
 *
 * Rules (F04 §2-§4, §7):
 * - `commandId` makes the request safe to repeat (offline devices retry): the same commandId with
 *   the same body returns the FIRST result (200); with a different body -> 409 `command_conflict`.
 * - One delivery = one location (open, inside the person's scope: else 400 `location_not_found`).
 * - Supplier must be active or waiting (waiting ones are allowed, F03 §9.10). Products must be
 *   active or waiting; hidden, merged or rejected ones -> 400 `product_not_receivable`.
 * - A line has a product, an optional pack unit (quantity is then in that unit; stock is always
 *   stored in pieces), a quantity, and the LINE TOTAL (the screen turns "cost each" into a total).
 *   A line WITHOUT a total is "price pending": the goods are received and can be sold; nothing is
 *   debited for that line until the cost is entered.
 * - People without `see_cost_profit` cannot send totals or payments (403 `forbidden`): all their
 *   lines are price pending ("cost to be added"). Paying needs `pay_suppliers` (403 otherwise).
 * - IMEI products need one unit per piece with a valid IMEI (15 digits, check digit); serial
 *   products one unit per piece with a serial; quantity products carry no units. Same IMEI twice
 *   in the request -> 400 `duplicate_imei_in_delivery`; invalid -> 400 `invalid_imei`; already in
 *   stock anywhere in the business -> 409 `imei_in_stock`; sold before -> 409 `imei_sold_before`
 *   unless `confirmSoldBefore` is true AND the person is an owner or manager.
 * - Fewer units than pieces -> 400 `imei_count_mismatch` unless `allowIncomplete`: the line then
 *   shows `missingUnits`, and those units cannot be sold until `POST /deliveries/:id/units`.
 * - Payments: each from one money place the person may use; the sum may not exceed the known
 *   total (400 `payment_exceeds_total`); the rest is owed to the supplier under `paymentRule` (this
 *   delivery only) or the supplier's rule. Paying from a drawer that would go below zero is allowed
 *   only for owners and managers (response `warnings`), otherwise 409 `insufficient_funds`.
 * - Nothing is edited or deleted afterwards (G4); corrections are F04b.
 * - VAT, free items, extra costs, US dollars, claims, low-profit warnings are NOT in this part.
 * People without `see_cost_profit` get every money field as null in responses.
 */
import { z } from "zod";
import { paymentRuleSchema } from "./suppliers.contract";

const id = z.string().min(1);
const cents = z.number().int().nonnegative().max(100_000_000_000);
const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();

export const deliveryUnitInputSchema = z.object({
  imei: z.string().trim().min(1).max(32).optional(),
  imei2: z.string().trim().min(1).max(32).optional(),
  serial: z.string().trim().min(1).max(64).optional(),
});
export type DeliveryUnitInput = z.input<typeof deliveryUnitInputSchema>;

export const deliveryLineInputSchema = z.object({
  productId: id,
  /** A pack unit of the product; absent means pieces. */
  packUnitId: id.optional(),
  quantity: z.number().int().min(1).max(100_000),
  /** What the supplier charged for the whole line; absent = price pending. */
  lineTotalCents: cents.optional(),
  units: z.array(deliveryUnitInputSchema).max(5000).default([]),
});
export type DeliveryLineInput = z.input<typeof deliveryLineInputSchema>;

export const deliveryPaymentInputSchema = z.object({
  moneyPlaceId: id,
  amountCents: cents.refine((v) => v > 0, { message: "amount_required" }),
});

export const createDeliveryRequestSchema = z.object({
  commandId: z.string().min(8).max(64),
  supplierId: id,
  locationId: id,
  invoiceNumber: optionalText(50),
  note: optionalText(300),
  /** Only for this delivery; absent = the supplier's own rule (F03 §4). */
  paymentRule: paymentRuleSchema.optional(),
  payments: z.array(deliveryPaymentInputSchema).max(10).default([]),
  lines: z.array(deliveryLineInputSchema).min(1).max(200),
  allowIncomplete: z.boolean().default(false),
  confirmSoldBefore: z.boolean().default(false),
});
export type CreateDeliveryRequest = z.input<typeof createDeliveryRequestSchema>;

export const enterCostsRequestSchema = z.object({
  commandId: z.string().min(8).max(64),
  lines: z
    .array(z.object({ lineId: id, lineTotalCents: cents }))
    .min(1)
    .max(200),
});
export type EnterCostsRequest = z.input<typeof enterCostsRequestSchema>;

export const completeUnitsRequestSchema = z.object({
  commandId: z.string().min(8).max(64),
  confirmSoldBefore: z.boolean().default(false),
  units: z
    .array(z.object({ lineId: id }).extend(deliveryUnitInputSchema.shape))
    .min(1)
    .max(5000),
});
export type CompleteUnitsRequest = z.input<typeof completeUnitsRequestSchema>;

export const UNIT_STATUSES = ["in_stock", "sold", "reserved", "damaged", "lost"] as const;

export const deliveryUnitSchema = z.object({
  id: z.string(),
  imei: z.string().nullable(),
  imei2: z.string().nullable(),
  serial: z.string().nullable(),
  status: z.enum(UNIT_STATUSES),
});

export const deliveryLineSchema = z.object({
  id: z.string(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    trackingType: z.enum(["imei", "serial", "quantity"]),
  }),
  packUnit: z.object({ id: z.string(), name: z.string(), size: z.number().int() }).nullable(),
  /** In the chosen unit; `pieces` is the same quantity in pieces. */
  quantity: z.number().int(),
  pieces: z.number().int(),
  /** null for people who may not see costs, or while the price is pending. */
  lineTotalCents: z.number().int().nullable(),
  costState: z.enum(["known", "pending"]),
  units: z.array(deliveryUnitSchema),
  /** Pieces still waiting for an IMEI/serial (incomplete delivery). */
  missingUnits: z.number().int().nonnegative(),
});

export const deliveryPaymentSchema = z.object({
  moneyPlace: z.object({ id: z.string(), name: z.string() }),
  amountCents: z.number().int(),
});

export const DELIVERY_WARNING_TYPES = ["drawer_negative"] as const;

export const deliverySchema = z.object({
  id: z.string(),
  /** Running number per business (1, 2, 3 ...). */
  number: z.number().int(),
  supplier: z.object({ id: z.string(), name: z.string() }),
  location: z.object({ id: z.string(), name: z.string() }),
  invoiceNumber: z.string().nullable(),
  note: z.string().nullable(),
  paymentRule: paymentRuleSchema,
  /** The money fields below are null for people without see_cost_profit. */
  knownTotalCents: z.number().int().nullable(),
  pendingCostLines: z.number().int().nonnegative(),
  paidCents: z.number().int().nullable(),
  owedCents: z.number().int().nullable(),
  /** From the payment rule when it is date based (within a time, cash); else null. */
  dueDate: z.string().nullable(),
  incompleteUnits: z.number().int().nonnegative(),
  lines: z.array(deliveryLineSchema),
  payments: z.array(deliveryPaymentSchema),
  warnings: z.array(z.object({ type: z.enum(DELIVERY_WARNING_TYPES), moneyPlaceId: z.string() })),
  createdBy: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
});
export type Delivery = z.infer<typeof deliverySchema>;
export const deliveryResponseSchema = z.object({ delivery: deliverySchema });
export const deliveriesResponseSchema = z.object({
  deliveries: z.array(deliverySchema),
  nextCursor: z.string().nullable(),
});
export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;
export type DeliveriesResponse = z.infer<typeof deliveriesResponseSchema>;

export const DELIVERY_ERROR_CODES = [
  "delivery_not_found",
  "command_conflict",
  /** The supplier is paid in US dollars (F04b); only KES suppliers can be received from now. */
  "supplier_currency_not_supported",
  "product_not_receivable",
  "invalid_pack_unit",
  "invalid_imei",
  "duplicate_imei_in_delivery",
  "imei_in_stock",
  "imei_sold_before",
  "imei_count_mismatch",
  "units_not_allowed",
  "payment_exceeds_total",
  "insufficient_funds",
  "cost_already_known",
  "line_not_found",
  "forbidden",
] as const;
