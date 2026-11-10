import { Injectable } from "@nestjs/common";
import type { ResetPasswordResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { IdentityService } from "../../identity/application/identity.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { StaffErrors } from "../domain/staff-errors";
import { canManagePerson } from "../domain/staff-policy";
import { StaffMembers } from "./staff-members";

/**
 * `POST /staff/:membershipId/reset-password` (owner, or `add_staff` for a
 * cashier/storekeeper at their own locations; F02 §5 "reset a staff PIN").
 * Issues a new temporary password (shown once, must be changed at next login,
 * expires after 72 h) and signs the person out everywhere.
 *
 * A password belongs to the person, not to one business. Someone who also
 * works in another business is refused (403 `forbidden`, details.reason
 * `member_of_other_business`): otherwise the owner of one shop could take over
 * the person's account in another. They recover with their own recovery codes.
 * The check and the write share one transaction holding a lock on the person
 * (S1a review #8), so a membership added in between cannot slip past it.
 */
@Injectable()
export class ResetStaffPasswordUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly members: MembersService,
    private readonly staff: StaffMembers,
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, membershipId: string): Promise<ResetPasswordResponse> {
    const { access } = actor;
    const member = await this.staff.load(access.tenantId, membershipId);
    if (!canManagePerson(access, member.role, member.locationIds)) throw StaffErrors.forbidden();
    if (member.userId === access.userId) throw StaffErrors.cannotChangeSelf();

    const temporaryPassword = await this.tenantDb.transaction(access.tenantId, async (t) => {
      if (!(await this.members.lockIfOnlyIn(t, member.userId))) {
        throw StaffErrors.memberOfOtherBusiness();
      }
      return this.members.resetToTemporaryPassword(t, member.userId);
    });
    await this.identity.revokeAllSessions(member.userId, "password_reset", access.tenantId);
    await this.audit.record({
      ...auditBase(actor),
      action: "staff_password_reset",
      targetId: membershipId,
      details: { mustChangePassword: true },
    });
    return { temporaryPassword };
  }
}
