import { Injectable } from "@nestjs/common";
import type { StaffMemberResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { IdentityService } from "../../identity/application/identity.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { StaffErrors } from "../domain/staff-errors";
import { assertNotSelf, assertOwner, removesOwner } from "../domain/staff-policy";
import { StaffMembers, auditView } from "./staff-members";

/**
 * `POST /staff/:membershipId/switch-off` (owner only; F02 §2.5, T7). The person
 * is signed out of THIS business at once (its sessions revoked, cached membership
 * dropped), so their very next request or refresh here fails. Sessions in their
 * other businesses stay (S1a review #2). Their history stays (G4).
 * Switching off someone already switched off changes nothing.
 */
@Injectable()
export class SwitchOffStaffUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly members: MembersService,
    private readonly staff: StaffMembers,
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, membershipId: string): Promise<StaffMemberResponse> {
    const { access } = actor;
    assertOwner(access);
    const { before, member } = await this.tenantDb.transaction(access.tenantId, async (t) => {
      const before = await this.staff.load(t.tenantId, membershipId, t);
      const owners = await this.staff.lockOwnerCount(t);
      assertNotSelf(access, before, { status: "switched_off" }, owners);
      if (before.status === "switched_off") return { before, member: before };
      if (removesOwner(before, { status: "switched_off" }) && owners <= 1) {
        throw StaffErrors.lastOwner();
      }
      await this.members.updateMembership(t, membershipId, { status: "switched_off" });
      return { before, member: await this.staff.load(t.tenantId, membershipId, t) };
    });
    if (before.status === member.status) return { member };

    await this.identity.revokeSessionsInBusiness(
      member.userId,
      access.tenantId,
      "staff_switched_off",
    );
    this.members.forget(member.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: "staff_switched_off",
      targetId: membershipId,
      details: { before: auditView(before), after: auditView(member) },
    });
    return { member };
  }
}
