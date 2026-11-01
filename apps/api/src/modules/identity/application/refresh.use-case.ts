import { Inject, Injectable } from "@nestjs/common";
import type { SessionResponse } from "@books/shared";
import { DB, type Database } from "../../../common/database/database.types";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { pickActiveMembership } from "../domain/active-tenant";
import { REFRESH_REUSE_GRACE_MS, refreshExpiry } from "../domain/auth-policy";
import { IdentityErrors } from "../domain/identity-errors";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import type { RefreshSessionRow } from "../infrastructure/tables/refresh-sessions.table";
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
    @Inject(DB) private readonly db: Database,
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
    const userId = stored.userId;
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
    const family = { id: stored.familyId, startedAt: stored.familyStartedAt };
    if (refreshExpiry(family.startedAt, now).getTime() <= now.getTime()) {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }

    const user = await this.users.findById(userId);
    if (!user || user.status !== "active") {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }
    const memberships = await this.view.membershipsOf(userId);
    const active = pickActiveMembership(memberships, stored.activeTenantId);
    // Burning the old token and storing its successor commit together. Parallel
    // requests with the same token queue on its row; only the first matches.
    const tokens = await this.db.transaction(async (tx) => {
      if (!(await this.sessions.markUsed(tokenHash, tx))) throw IdentityErrors.refreshInProgress();
      return this.issuer.rotate(family, userId, active, meta, tx);
    });
    return {
      response: this.view.build(user, memberships, active?.tenantId ?? null),
      tokens,
    };
  }

  private async isRacingTab(stored: RefreshSessionRow, now: Date): Promise<boolean> {
    if (!stored.usedAt || now.getTime() - stored.usedAt.getTime() >= REFRESH_REUSE_GRACE_MS) {
      return false;
    }
    if (await this.sessions.isFamilyActive(stored.familyId, now)) return true;
    // Defensive: a successor that is not visible yet still means "not revoked".
    return !(await this.sessions.isFamilyRevoked(stored.familyId));
  }
}
