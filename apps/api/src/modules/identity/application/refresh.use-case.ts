import { Injectable } from "@nestjs/common";
import type { SessionResponse } from "@books/shared";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { pickActiveMembership } from "../domain/active-tenant";
import { REFRESH_REUSE_GRACE_MS, refreshExpiry } from "../domain/auth-policy";
import { IdentityErrors } from "../domain/identity-errors";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import type { RefreshSessionDoc } from "../infrastructure/schemas/refresh-session.schema";
import { TokenService } from "../infrastructure/token-service";
import { UsersRepository } from "../infrastructure/users.repository";
import { SessionIssuer, type IssuedTokens } from "./session-issuer";
import { SessionView } from "./session-view";

/**
 * Rotating refresh: each refresh token works once. If a token that was already
 * rotated shows up again, someone copied it, so the whole session family is
 * revoked and both the thief and the real user must log in again.
 *
 * Exception (security review M4): two tabs share one cookie and may refresh at
 * the same moment. A token rotated less than 30 s ago whose successor is still
 * active gets 409 `refresh_in_progress` instead; the losing tab just retries
 * with the cookie the winner already received.
 */
@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly sessions: RefreshSessionsRepository,
    private readonly tokens: TokenService,
    private readonly users: UsersRepository,
    private readonly issuer: SessionIssuer,
    private readonly view: SessionView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    refreshToken: string | undefined,
    meta: RequestMeta,
  ): Promise<{ response: SessionResponse; tokens: IssuedTokens }> {
    if (!refreshToken) throw IdentityErrors.sessionExpired();
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.sessions.findByHash(tokenHash);
    if (!stored) throw IdentityErrors.sessionExpired();

    const now = new Date();
    const userId = stored.userId.toHexString();
    if (stored.status === "used") {
      if (await this.isRacingTab(stored, now)) throw IdentityErrors.refreshInProgress();
      await this.sessions.revokeFamily(stored.familyId);
      await this.audit.record({
        action: "refresh_token_reuse",
        outcome: "failure",
        userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw IdentityErrors.sessionExpired();
    }
    if (stored.status !== "active" || stored.expiresAt.getTime() <= now.getTime()) {
      throw IdentityErrors.sessionExpired();
    }
    // Older documents have no family start; their first token's createdAt is close enough.
    const family = { id: stored.familyId, startedAt: stored.familyStartedAt ?? stored.createdAt };
    if (refreshExpiry(family.startedAt, now).getTime() <= now.getTime()) {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }
    // Another request rotated this very token a moment ago (parallel tabs).
    if (!(await this.sessions.markUsed(tokenHash))) throw IdentityErrors.refreshInProgress();

    const user = await this.users.findById(userId);
    if (!user || user.status !== "active") {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }
    const memberships = await this.view.membershipsOf(userId);
    const active = pickActiveMembership(memberships, stored.activeTenantId?.toHexString() ?? null);
    const tokens = await this.issuer.rotate(family, userId, active, meta);
    return {
      response: this.view.build(user, memberships, active?.tenantId ?? null),
      tokens,
    };
  }

  private async isRacingTab(stored: RefreshSessionDoc, now: Date): Promise<boolean> {
    if (!stored.usedAt || now.getTime() - stored.usedAt.getTime() >= REFRESH_REUSE_GRACE_MS) {
      return false;
    }
    if (await this.sessions.isFamilyActive(stored.familyId, now)) return true;
    // The winning request may still be issuing the successor (a few ms after
    // marking this token used). The family not being revoked tells us so.
    return !(await this.sessions.isFamilyRevoked(stored.familyId));
  }
}
