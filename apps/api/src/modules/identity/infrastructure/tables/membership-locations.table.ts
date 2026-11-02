import { boolean, foreignKey, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, updatedAtColumn } from "../../../../common/database/columns";
import { locations } from "../../../locations/infrastructure/tables/locations.table";
import { memberships } from "./memberships.table";

/**
 * Which locations a (non-owner) member works at (F02 §4.3). Tenant-owned, under
 * row-level security. Unassigning sets `active = false`; rows are never deleted
 * (G4). Both composite foreign keys include `tenant_id`, so a link can never
 * point at another business's membership or location.
 */
export const membershipLocations = pgTable(
  "membership_locations",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    locationId: uuid("location_id").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    unique("membership_locations_member_location_unique").on(t.membershipId, t.locationId),
    index("membership_locations_tenant_location_idx").on(t.tenantId, t.locationId),
    foreignKey({
      name: "membership_locations_membership_fk",
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [memberships.tenantId, memberships.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "membership_locations_location_fk",
      columns: [t.tenantId, t.locationId],
      foreignColumns: [locations.tenantId, locations.id],
    }).onDelete("restrict"),
  ],
);

export type MembershipLocationRow = typeof membershipLocations.$inferSelect;
