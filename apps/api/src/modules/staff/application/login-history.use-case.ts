import { Injectable } from "@nestjs/common";
import type { LoginHistoryResponse } from "@books/shared";
import { AuditService } from "../../audit/application/audit.service";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { assertOwner } from "../domain/staff-policy";
import { StaffMembers } from "./staff-members";

const HISTORY_LIMIT = 100;

/**
 * `GET /staff/:membershipId/logins` (owner): the person's last 100 login
 * attempts, newest first, from the audit log (F02 §6). Logins into other
 * businesses the person works for are not shown.
 */
@Injectable()
export class LoginHistoryUseCase {
  constructor(
    private readonly staff: StaffMembers,
    private readonly audit: AuditService,
  ) {}

  async execute(access: TenantAccessContext, membershipId: string): Promise<LoginHistoryResponse> {
    assertOwner(access);
    const member = await this.staff.load(access.tenantId, membershipId);
    const rows = await this.audit.loginHistory(member.userId, access.tenantId, HISTORY_LIMIT);
    return {
      entries: rows.map((r) => ({
        at: r.at.toISOString(),
        outcome: r.outcome === "success" ? "success" : r.reason === "locked" ? "locked" : "failure",
        ip: r.ip || null,
        device: r.userAgent || null,
      })),
    };
  }
}
