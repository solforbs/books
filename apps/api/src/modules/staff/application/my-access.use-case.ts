import { Injectable } from "@nestjs/common";
import {
  PERMISSIONS,
  effectivePermissions,
  isApprover,
  type MyAccessResponse,
} from "@books/shared";
import { MembersService } from "../../identity/application/members.service";
import type { TenantAccessContext } from "../../identity/domain/auth-context";

/**
 * `GET /me/permissions`: what the caller may do here, from the membership read
 * on this request. `approvalsActive` is true once the business has any active
 * member who is not an approver (G1): until then no approval steps, PINs or
 * waiting labels are shown to anyone.
 */
@Injectable()
export class MyAccessUseCase {
  constructor(private readonly members: MembersService) {}

  async execute(access: TenantAccessContext): Promise<MyAccessResponse> {
    const granted = effectivePermissions(access.role, access.permissionOverrides);
    const members = await this.members.list(access.tenantId);
    return {
      role: access.role,
      locationIds: access.locationIds,
      permissions: PERMISSIONS.filter((p) => granted.has(p)),
      approvalsActive: members.some(
        (m) => m.status === "active" && !isApprover(m.role, m.permissions),
      ),
    };
  }
}
