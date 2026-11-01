import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, oneOf, timestampTz } from "../../../../common/database/columns";
import { tenants } from "./tenants.table";
import { users } from "./users.table";

export const REFRESH_SESSION_STATUSES = ["active", "used", "revoked"] as const;

/**
 * Used, revoked and expired tokens are kept a week after `expires_at` for reuse
 * detection and audit, then purged by `purge_expired_refresh_sessions()`.
 */
export const REFRESH_SESSION_PURGE_AFTER_SECONDS = 7 * 24 * 60 * 60;

/**
 * One row per refresh token. Every token issued from the same login shares a
 * `family_id` (the session id, `sid` in the access token). A token is used once:
 * rotation marks it `used`; presenting a `used` token again means it was stolen,
 * so the whole family is revoked (unless it is a tab racing a fresh rotation,
 * see RefreshUseCase).
 */
export const refreshSessions = pgTable(
  "refresh_sessions",
  {
    id: idColumn(),
    familyId: text("family_id").notNull(),
    /** HMAC-SHA256 of the opaque token; the token itself is never stored. */
    tokenHash: text("token_hash").notNull().unique("refresh_sessions_token_hash_unique"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activeTenantId: uuid("active_tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),
    status: text("status")
      .$type<(typeof REFRESH_SESSION_STATUSES)[number]>()
      .notNull()
      .default("active"),
    /** When the login that started this family happened; caps the total session lifetime. */
    familyStartedAt: timestampTz("family_started_at").notNull(),
    expiresAt: timestampTz("expires_at").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    ip: text("ip").notNull().default(""),
    usedAt: timestampTz("used_at"),
    revokedAt: timestampTz("revoked_at"),
    createdAt: createdAtColumn(),
  },
  (t) => [
    index("refresh_sessions_family_status_idx").on(t.familyId, t.status),
    index("refresh_sessions_user_status_idx").on(t.userId, t.status),
    index("refresh_sessions_expires_at_idx").on(t.expiresAt),
    check("refresh_sessions_status", oneOf(t.status, REFRESH_SESSION_STATUSES)),
  ],
);

export type RefreshSessionRow = typeof refreshSessions.$inferSelect;
