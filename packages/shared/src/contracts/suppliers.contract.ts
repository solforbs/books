/**
 * Suppliers and their payment rules (F03). Requires a selected business.
 * Base path: /api/v1/suppliers
 *
 *   GET   /suppliers                 -> SuppliersResponse   (permission: manage_suppliers or
 *                                       receive_stock; query: q, status, neighbour=true,
 *                                       limit<=100, cursor; alphabetical; default status filter
 *                                       is active + waiting; hidden only when asked)
 *   GET   /suppliers/waiting         -> SuppliersResponse   (permission: approve_items)
 *   GET   /suppliers/:id             -> SupplierResponse    (same read permission as the list)
 *   POST  /suppliers                 -> SupplierResponse 201 (permission: manage_suppliers; status
 *                                       is `active`, name + phone + payment rule required)
 *   POST  /suppliers/quick           -> SupplierResponse 201 (permission: receive_stock, for
 *                                       people WITHOUT manage_suppliers; name only; status
 *                                       `waiting`; F03 §9.10. People with manage_suppliers get
 *                                       400 `use_full_form`)
 *   PATCH /suppliers/:id             -> SupplierResponse    (manage_suppliers)
 *   POST  /suppliers/:id/approve     -> SupplierResponse    (approve_items; completes a waiting
 *                                       supplier: body must make phone present; optional fixes)
 *   POST  /suppliers/:id/hide | /unhide -> SupplierResponse (manage_suppliers)
 *
 * Rules (F03 §3, §4, §8, §9):
 * - Phone is unique per business among suppliers that are not merged away: the same phone on
 *   another supplier -> 409 `supplier_phone_exists` (details.existingId, existingName).
 *   Suppliers may be abroad (Dubai, China), so a phone is either a Kenyan number (normalized to
 *   +254...) or an international number written as +<country code><digits> (7-15 digits).
 * - A similar name gives a warning: 409 `similar_suppliers` (details.suppliers) unless the
 *   request sets `acknowledgeSimilar: true`.
 * - Payment rule: exactly one per supplier (default `cash`). `within_time` and
 *   `after_sold_with_latest_date` carry a period (a number of days, weeks or months). The rule
 *   can be changed on a single delivery later (F04); changing it here affects only NEW
 *   deliveries. Rules are stored, not yet calculated: "due now" arrives with F04 and F07.
 * - Currency is KES (default) or USD. KRA PIN is optional everywhere (G3).
 * - Approvals (G1): `active` when the creator is an approver, but phone-less quick-add suppliers
 *   are always `waiting` until an approver completes them. Solo shops never see waiting ones.
 * - Hiding is allowed only when the supplier's balance is zero (409 `supplier_has_balance`;
 *   balances do not exist yet, so this is an extension point that reports zero for now).
 * - Nothing is deleted (G4). Every write is audited.
 * Not in this slice (they need receiving, payments or customers): starting balances, offset,
 * "due now", reminders, deliveries, exchange rates.
 */
import { z } from "zod";
import { normalizeKenyanPhone } from "../identity/phone";
import { KRA_PIN_PATTERN } from "./business.contract";

export const PAYMENT_RULE_TYPES = [
  "cash",
  "within_time",
  "pay_as_you_sell",
  "pay_after_all_sold",
  "after_sold_with_latest_date",
] as const;
export type PaymentRuleType = (typeof PAYMENT_RULE_TYPES)[number];
export const TIME_UNITS = ["days", "weeks", "months"] as const;
export const CURRENCIES = ["KES", "USD"] as const;
export const SUPPLIER_STATUSES = ["waiting", "active", "hidden"] as const;

export const periodSchema = z.object({
  value: z.number().int().min(1).max(3650),
  unit: z.enum(TIME_UNITS),
});
export type Period = z.infer<typeof periodSchema>;

export const paymentRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cash") }),
  z.object({ type: z.literal("within_time"), period: periodSchema }),
  z.object({ type: z.literal("pay_as_you_sell") }),
  z.object({ type: z.literal("pay_after_all_sold") }),
  /** Due when sold OR at the latest date, whichever comes first (F03 §4). */
  z.object({ type: z.literal("after_sold_with_latest_date"), period: periodSchema }),
]);
export type PaymentRule = z.infer<typeof paymentRuleSchema>;

/** A Kenyan number (normalized to +254...) or an international +<country code><digits>. */
export function normalizeSupplierPhone(input: string): string | null {
  const kenyan = normalizeKenyanPhone(input);
  if (kenyan) return kenyan;
  const compact = input.replace(/[\s\-()]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const phone = normalizeSupplierPhone(v);
    if (!phone) ctx.addIssue({ code: "custom", message: "invalid_phone" });
    return phone ?? v;
  });

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
const kraPin = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(KRA_PIN_PATTERN, { error: "invalid_kra_pin" }).nullable())
  .nullable()
  .optional();

export const createSupplierRequestSchema = z.object({
  name: text(100).pipe(z.string().min(2)),
  phone: phoneSchema,
  paymentRule: paymentRuleSchema.default({ type: "cash" }),
  currency: z.enum(CURRENCIES).default("KES"),
  isNeighbour: z.boolean().default(false),
  kraPin,
  marketOrLocation: optionalText(100),
  notes: optionalText(500),
  acknowledgeSimilar: z.boolean().default(false),
});
export type CreateSupplierRequest = z.input<typeof createSupplierRequestSchema>;

/** Receiving stock from a supplier who is not in the list yet (F03 §9.10): name only. */
export const quickSupplierRequestSchema = z.object({
  name: text(100).pipe(z.string().min(2)),
  acknowledgeSimilar: z.boolean().default(false),
});
export type QuickSupplierRequest = z.input<typeof quickSupplierRequestSchema>;

const supplierFields = {
  name: text(100).pipe(z.string().min(2)),
  phone: phoneSchema,
  paymentRule: paymentRuleSchema,
  currency: z.enum(CURRENCIES),
  isNeighbour: z.boolean(),
  kraPin,
  marketOrLocation: optionalText(100),
  notes: optionalText(500),
  acknowledgeSimilar: z.boolean(),
};

export const updateSupplierRequestSchema = z
  .object(supplierFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "nothing_to_update" });
export type UpdateSupplierRequest = z.input<typeof updateSupplierRequestSchema>;

/** Completing a waiting supplier: the phone is required, anything else may be fixed too. */
export const approveSupplierRequestSchema = z.object(supplierFields).partial({
  name: true,
  paymentRule: true,
  currency: true,
  isNeighbour: true,
  kraPin: true,
  marketOrLocation: true,
  notes: true,
  acknowledgeSimilar: true,
});
export type ApproveSupplierRequest = z.input<typeof approveSupplierRequestSchema>;

export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  paymentRule: paymentRuleSchema,
  currency: z.enum(CURRENCIES),
  isNeighbour: z.boolean(),
  kraPin: z.string().nullable(),
  marketOrLocation: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(SUPPLIER_STATUSES),
  addedBy: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
});
export type Supplier = z.infer<typeof supplierSchema>;
export const supplierResponseSchema = z.object({ supplier: supplierSchema });
export const suppliersResponseSchema = z.object({
  suppliers: z.array(supplierSchema),
  nextCursor: z.string().nullable(),
});
export type SupplierResponse = z.infer<typeof supplierResponseSchema>;
export type SuppliersResponse = z.infer<typeof suppliersResponseSchema>;

export const SUPPLIER_ERROR_CODES = [
  "supplier_not_found",
  "supplier_phone_exists",
  "similar_suppliers",
  "supplier_has_balance",
  "use_full_form",
  "not_waiting",
  "phone_required",
  "forbidden",
] as const;
