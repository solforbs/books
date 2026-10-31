import { Injectable } from "@nestjs/common";
import type { SessionResponse } from "@books/shared";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { pickActiveMembership } from "../domain/active-tenant";
import { IdentityErrors } from "../domain/identity-errors";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";
import { UsersRepository } from "../infrastructure/users.repository";
import { SessionIssuer, type IssuedTokens } from "./session-issuer";
import { SessionView } from "./session-view";

/**
 * Rotating refresh: each refresh token works once. If a token that was already
 * rotated shows up again, someone copied it, so the whole session family is
 * revoked and both the thief and the real user must log in again.
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

    const userId = stored.userId.toHexString();
    if (stored.status === "used") {
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
    if (stored.status !== "active" || stored.expiresAt.getTime() <= Date.now()) {
      throw IdentityErrors.sessionExpired();
    }
    // Lost a race with another refresh using the same token: treat as reuse.
    if (!(await this.sessions.markUsed(tokenHash))) {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }

    const user = await this.users.findById(userId);
    if (!user || user.status !== "active") {
      await this.sessions.revokeFamily(stored.familyId);
      throw IdentityErrors.sessionExpired();
    }
    const memberships = await this.view.membershipsOf(userId);
    const active = pickActiveMembership(memberships, stored.activeTenantId?.toHexString() ?? null);
    const tokens = await this.issuer.rotate(stored.familyId, userId, active, meta);
    return {
      response: this.view.build(user, memberships, active?.tenantId ?? null),
      tokens,
    };
  }
}
