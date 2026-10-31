/**
 * Auth API contract (ARCH-01 §8). Both apps/api and apps/web import these
 * schemas so request and response shapes can never drift apart.
 *
 * Base path: /api/v1/auth. Tokens travel only in httpOnly cookies:
 *   books_at  – access token, 15 min, path /api
 *   books_rt  – refresh token, rotating, path /api/v1/auth
 * State-changing requests must send the header `X-Books-Client: web` (CSRF guard).
 */
import { z } from "zod";
import { normalizeKenyanPhone } from "../identity/phone";
import { PASSWORD_MAX_LENGTH, isStrongPassword } from "../identity/password-policy";
import { LANGUAGES, ROLES } from "../identity/roles";

export const CLIENT_HEADER = "x-books-client";
export const CLIENT_HEADER_VALUE = "web";

const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const phone = normalizeKenyanPhone(v);
    if (!phone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_phone" });
    return phone ?? v;
  });

const emailSchema = z.string().trim().toLowerCase().email("invalid_email").max(254);
const strongPassword = z
  .string()
  .max(PASSWORD_MAX_LENGTH)
  .refine((p) => isStrongPassword(p), { message: "weak_password" });

/** A login identifier is either a Kenyan phone number or an email address. */
export const identifierSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .transform((v) => (v.includes("@") ? v.toLowerCase() : (normalizeKenyanPhone(v) ?? v)));

export const registerRequestSchema = z
  .object({
    businessName: z.string().trim().min(2).max(100),
    ownerName: z.string().trim().min(2).max(100),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    // Strength is checked once below, together with the owner's and business names.
    password: z.string().max(PASSWORD_MAX_LENGTH),
    language: z.enum(LANGUAGES).default("en"),
  })
  .refine((d) => d.phone || d.email, { message: "phone_or_email_required", path: ["phone"] })
  .refine((d) => isStrongPassword(d.password, [d.ownerName, d.businessName]), {
    message: "weak_password",
    path: ["password"],
  });
export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const selectBusinessRequestSchema = z.object({ tenantId: z.string().min(1) });
export type SelectBusinessRequest = z.input<typeof selectBusinessRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: strongPassword,
});
export type ChangePasswordRequest = z.input<typeof changePasswordRequestSchema>;

export const recoverRequestSchema = z.object({
  identifier: identifierSchema,
  recoveryCode: z.string().trim().min(8).max(32),
  newPassword: strongPassword,
});
export type RecoverRequest = z.input<typeof recoverRequestSchema>;

export const membershipSchema = z.object({
  tenantId: z.string(),
  businessName: z.string(),
  role: z.enum(ROLES),
});
export type Membership = z.infer<typeof membershipSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  language: z.enum(LANGUAGES),
  mustChangePassword: z.boolean(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Returned by register, login, select-business, refresh and me. */
export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
  memberships: z.array(membershipSchema),
  /** null when the user belongs to several businesses and has not picked one yet. */
  activeTenantId: z.string().nullable(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const registerResponseSchema = sessionResponseSchema.extend({
  /** Shown once to the owner; only hashes are stored on the server. */
  recoveryCodes: z.array(z.string()).length(10),
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/** Every API error has this shape. `code` is stable and translated by the web app. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const AUTH_ERROR_CODES = [
  "validation_failed",
  "identifier_taken",
  "invalid_credentials",
  "account_locked",
  "too_many_requests",
  "not_authenticated",
  "session_expired",
  /** 409 from POST /auth/refresh: another tab just rotated the token; retry GET /auth/me. */
  "refresh_in_progress",
  "business_not_selected",
  "not_a_member",
  "invalid_recovery_code",
  "csrf_header_missing",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
