import { Injectable } from "@nestjs/common";
import type { StaffMember } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { MembersService } from "../../identity/application/members.service";
import { StaffErrors } from "../domain/staff-errors";

/** Lookups shared by the staff use cases. */
@Injectable()
export class StaffMembers {
  constructor(private readonly members: MembersService) {}

  async load(tenantId: string, membershipId: string, t?: TenantTx): Promise<StaffMember> {
    const member = await this.members.get(tenantId, membershipId, t);
    if (!member) throw StaffErrors.memberNotFound();
    return member;
  }

  /** Locks the active owners for this transaction and returns how many there are. */
  async lockOwnerCount(t: TenantTx): Promise<number> {
    return (await this.members.lockActiveOwners(t)).length;
  }
}

/** The fields worth keeping in the audit trail (phone/email are masked on write). */
export const auditView = (m: StaffMember) => ({
  name: m.name,
  role: m.role,
  status: m.status,
  locationIds: m.locationIds,
  permissions: m.permissions,
});
