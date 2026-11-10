import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { ROLES, type PermissionOverrides, type Role } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  timestampTz,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "./tenants.table";
import { users } from "./users.table";

export const MEMBERSHIP_STATUSES = ["active", "switched_off"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/**
 * Links a user to a business with a role. Switched off, never deleted (G4).
 *
 * Deliberately NOT under row-level security: this table is the cross-business
 * directory used to find which businesses a person belongs to, before any
 * business is chosen. Every query here is keyed by the user or by the business.
 */
export const memberships = pgTable(
  "memberships",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    role: text("role").$type<Role>().notNull(),
    status: text("status").$type<MembershipStatus>().notNull().default("active"),
    /** Per-person switches (F02 §4.2) on top of the role defaults; owners ignore them. */
    permissionOverrides: jsonb("permission_overrides")
      .$type<PermissionOverrides>()
      .notNull()
      .default({}),
    /** Last login or business selection into THIS business (staff list, F02 §6). */
    lastLoginAt: timestampTz("last_login_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("memberships_user_tenant_unique").on(t.userId, t.tenantId),
    // Target of composite foreign keys: a link row can only name a membership of its own business.
    unique("memberships_tenant_id_unique").on(t.tenantId, t.id),
    index("memberships_tenant_status_idx").on(t.tenantId, t.status),
    check("memberships_role", oneOf(t.role, ROLES)),
    check("memberships_status", oneOf(t.status, MEMBERSHIP_STATUSES)),
    check(
      "memberships_permission_overrides_object",
      sql`jsonb_typeof(${t.permissionOverrides}) = 'object'`,
    ),
  ],
);

export type MembershipRow = typeof memberships.$inferSelect;
