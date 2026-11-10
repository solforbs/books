import { Injectable } from "@nestjs/common";
import { AuditService } from "../../audit/application/audit.service";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TenantAccess } from "./tenant-access";

/**
 * Public interface of the identity module for other modules (house rule 2:
 * they call this, never the identity collections).
 */
@Injectable()
export class IdentityService {
  constructor(
    private readonly sessions: RefreshSessionsRepository,
    private readonly access: TenantAccess,
    private readonly audit: AuditService,
  ) {}

  /**
   * Signs a user out on every device at once: all refresh-token families are
   * revoked, so their access tokens stop working on the next request. Call it
   * when a membership is disabled or a role changes (F02), so the person has to
   * log in again and gets a token matching their new rights.
   */
  async revokeAllSessions(userId: string, reason: string, tenantId?: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
    this.access.forgetUser(userId);
    await this.audit.record({
      action: "sessions_revoked",
      outcome: "success",
      userId,
      tenantId: tenantId ?? null,
      reason,
    });
  }

  /**
   * Signs a user out of ONE business (switched off there, S1a review #2): only
   * the sessions working in that business end; the person stays signed in to
   * their other businesses. Their cached access is dropped either way.
   */
  async revokeSessionsInBusiness(userId: string, tenantId: string, reason: string): Promise<void> {
    await this.sessions.revokeForUserInTenant(userId, tenantId);
    this.access.forgetUser(userId);
    await this.audit.record({
      action: "sessions_revoked",
      outcome: "success",
      userId,
      tenantId,
      reason,
    });
  }
}
