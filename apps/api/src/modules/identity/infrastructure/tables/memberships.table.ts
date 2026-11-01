import { check, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { ROLES, type Role } from "@books/shared";
import {
  createdAtColumn,
  idColumn,
  oneOf,
  updatedAtColumn,
} from "../../../../common/database/columns";
import { tenants } from "./tenants.table";
import { users } from "./users.table";

export const MEMBERSHIP_STATUSES = ["active", "disabled"] as const;

/**
 * Links a user to a business with a role. Switched off, never deleted (G4).
 *
 * Deliberately NOT under row-level security: this table is the cross-business
 * directory used to find which businesses a person belongs to, before any
 * business is chosen. Every query here is keyed by the user instead.
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
    status: text("status")
      .$type<(typeof MEMBERSHIP_STATUSES)[number]>()
      .notNull()
      .default("active"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("memberships_user_tenant_unique").on(t.userId, t.tenantId),
    index("memberships_tenant_status_idx").on(t.tenantId, t.status),
    check("memberships_role", oneOf(t.role, ROLES)),
    check("memberships_status", oneOf(t.status, MEMBERSHIP_STATUSES)),
  ],
);

export type MembershipRow = typeof memberships.$inferSelect;
