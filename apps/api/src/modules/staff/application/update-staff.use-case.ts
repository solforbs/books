import { Injectable } from "@nestjs/common";
import type { StaffMemberResponse, updateStaffRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { StaffErrors } from "../domain/staff-errors";
import {
  assertHasLocation,
  assertNotSelf,
  assertOwner,
  removesOwner,
} from "../domain/staff-policy";
import { StaffMembers, auditView } from "./staff-members";

export type UpdateStaffInput = z.output<typeof updateStaffRequestSchema>;

/**
 * `PATCH /staff/:membershipId` (owner only): name, role, locations, switches.
 * Takes effect on the person's next request (their cached membership is
 * dropped after commit). Owners have no location list: they see everything.
 */
@Injectable()
export class UpdateStaffUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly members: MembersService,
    private readonly staff: StaffMembers,
    private readonly locations: LocationsService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    actor: Actor,
    membershipId: string,
    input: UpdateStaffInput,
  ): Promise<StaffMemberResponse> {
    const { access } = actor;
    assertOwner(access);
    const { before, member } = await this.tenantDb.transaction(access.tenantId, async (t) => {
      const before = await this.staff.load(t.tenantId, membershipId, t);
      const owners = await this.staff.lockOwnerCount(t);
      const touchesAccess = Object.keys(input).some((k) => k !== "name");
      if (touchesAccess) assertNotSelf(access, before, { role: input.role }, owners);
      if (removesOwner(before, { role: input.role }) && owners <= 1) throw StaffErrors.lastOwner();

      const role = input.role ?? before.role;
      const locationIds =
        role === "owner" ? [] : [...new Set(input.locationIds ?? before.locationIds)];
      assertHasLocation(role, locationIds);
      if (input.locationIds) await this.locations.assertUsable(t.tenantId, locationIds, null, t);

      if (input.name !== undefined) await this.members.setName(t, before.userId, input.name);
      if (input.role !== undefined || input.permissions !== undefined) {
        await this.members.updateMembership(t, membershipId, {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.permissions !== undefined ? { permissionOverrides: input.permissions } : {}),
        });
      }
      if (input.locationIds !== undefined || role !== before.role) {
        await this.members.replaceLocations(t, membershipId, before.userId, locationIds);
      }
      return { before, member: await this.staff.load(t.tenantId, membershipId, t) };
    });
    this.members.forget(member.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: before.role !== member.role ? "staff_role_changed" : "staff_updated",
      targetId: membershipId,
      details: { before: auditView(before), after: auditView(member) },
    });
    return { member };
  }
}
