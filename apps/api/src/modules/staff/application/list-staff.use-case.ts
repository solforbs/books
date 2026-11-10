import { Injectable } from "@nestjs/common";
import { effectivePermissions, type StaffListResponse } from "@books/shared";
import { MembersService } from "../../identity/application/members.service";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { StaffErrors } from "../domain/staff-errors";
import { isOwner } from "../domain/staff-policy";

/**
 * `GET /staff`: owners see everyone (switched-off people too). A member with
 * `add_staff` sees the people who work at one of their locations.
 */
@Injectable()
export class ListStaffUseCase {
  constructor(private readonly members: MembersService) {}

  async execute(access: TenantAccessContext): Promise<StaffListResponse> {
    const all = await this.members.list(access.tenantId);
    if (isOwner(access)) return { members: all };
    if (!effectivePermissions(access.role, access.permissionOverrides).has("add_staff")) {
      throw StaffErrors.forbidden();
    }
    const own = new Set(access.locationIds);
    return { members: all.filter((m) => m.locationIds.some((id) => own.has(id))) };
  }
}
