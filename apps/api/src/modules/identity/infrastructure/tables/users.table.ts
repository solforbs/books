import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { LANGUAGES, type Language } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";

export const USER_STATUSES = ["active", "disabled"] as const;

/** Users are global (not tenant-owned): one person can belong to several businesses. */
export const users = pgTable(
  "users",
  {
    id: idColumn(),
    name: text("name").notNull(),
    /** E.164 (+2547XXXXXXXX), normalised by @books/shared. Null when not given. */
    phone: text("phone").unique("users_phone_unique"),
    /** Always lower-case (CHECK below), so the plain unique index is case-insensitive. */
    email: text("email").unique("users_email_unique"),
    passwordHash: text("password_hash").notNull(),
    language: text("language").$type<Language>().notNull().default("en"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    status: text("status").$type<(typeof USER_STATUSES)[number]>().notNull().default("active"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestampTz("locked_until"),
    lastLoginAt: timestampTz("last_login_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    check("users_phone_or_email", sql`${t.phone} is not null or ${t.email} is not null`),
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_language", oneOf(t.language, LANGUAGES)),
    check("users_status", oneOf(t.status, USER_STATUSES)),
    check("users_failed_login_count", sql`${t.failedLoginCount} >= 0`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
