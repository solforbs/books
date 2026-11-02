/**
 * Business details (F02 "Business details for documents") and business settings.
 * Base path: /api/v1/business. Requires a selected business (activeTenantId).
 *   GET  /business          -> BusinessResponse          (any member)
 *   PUT  /business          -> BusinessResponse          (permission: manage_business)
 * KRA PIN is optional everywhere (G3). VAT is OFF by default (G3, F06).
 */
import { z } from "zod";
import { normalizeKenyanPhone } from "../identity/phone";

/** Kenyan KRA PIN format: letter, 9 digits, letter (e.g. A123456789B). Optional. */
export const KRA_PIN_PATTERN = /^[A-Z]\d{9}[A-Z]$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const updateBusinessRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: optionalText(200),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const phone = normalizeKenyanPhone(v);
      if (!phone) ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return phone ?? v;
    })
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ error: "invalid_email" }).max(254).nullable())
    .nullable()
    .optional(),
  kraPin: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(KRA_PIN_PATTERN, { error: "invalid_kra_pin" }).nullable())
    .nullable()
    .optional(),
  footerNote: optionalText(300),
  vatEnabled: z.boolean(),
});
export type UpdateBusinessRequest = z.input<typeof updateBusinessRequestSchema>;

export const businessSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  kraPin: z.string().nullable(),
  footerNote: z.string().nullable(),
  vatEnabled: z.boolean(),
  createdAt: z.string(),
});
export type Business = z.infer<typeof businessSchema>;
export const businessResponseSchema = z.object({ business: businessSchema });
export type BusinessResponse = z.infer<typeof businessResponseSchema>;
