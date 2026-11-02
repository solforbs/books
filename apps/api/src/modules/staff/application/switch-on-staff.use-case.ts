import { Injectable } from "@nestjs/common";
import type { StaffMemberResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { assertHasLocation, assertNotSelf, assertOwner } from "../domain/staff-policy";
import { StaffMembers, auditView } from "./staff-members";

/**
 * `POST /staff/:membershipId/switch-on` (owner only): the person can log in to
 * this business again. A non-owner whose locations were all closed meanwhile
 * needs a location first (`location_required`; set it with PATCH).
 */
@Injectable()
export class SwitchOnStaffUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly members: MembersService,
    private readonly staff: StaffMembers,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, membershipId: string): Promise<StaffMemberResponse> {
    const { access } = actor;
    assertOwner(access);
    const { before, member } = await this.tenantDb.transaction(access.tenantId, async (t) => {
      const before = await this.staff.load(t.tenantId, membershipId, t);
      assertNotSelf(access, before, { status: "active" }, Number.POSITIVE_INFINITY);
      if (before.status === "active") return { before, member: before };
      assertHasLocation(before.role, before.locationIds);
      await this.members.updateMembership(t, membershipId, { status: "active" });
      return { before, member: await this.staff.load(t.tenantId, membershipId, t) };
    });
    if (before.status === member.status) return { member };

    this.members.forget(member.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: "staff_switched_on",
      targetId: membershipId,
      details: { before: auditView(before), after: auditView(member) },
    });
    return { member };
  }
}
