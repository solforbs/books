import { Injectable } from "@nestjs/common";
import type { RequestMeta } from "../../../common/security/request-meta";
import type { ActiveMembership } from "../domain/active-tenant";
import { REFRESH_TOKEN_TTL_SECONDS } from "../domain/auth-policy";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/** Creates and rotates sessions: one refresh-token family per login. */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: RefreshSessionsRepository,
  ) {}

  /** A brand-new session (login, register). */
  start(userId: string, active: ActiveMembership | null, meta: RequestMeta): Promise<IssuedTokens> {
    return this.issue(this.tokens.newSessionId(), userId, active, meta);
  }

  /** Next token in an existing family (refresh rotation). */
  rotate(
    sessionId: string,
    userId: string,
    active: ActiveMembership | null,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    return this.issue(sessionId, userId, active, meta);
  }

  /** A new access token only, e.g. after choosing a business. */
  accessToken(sessionId: string, userId: string, active: ActiveMembership | null): Promise<string> {
    return this.tokens.signAccess({
      sub: userId,
      sid: sessionId,
      tenantId: active?.tenantId ?? null,
      role: active?.role ?? null,
    });
  }

  private async issue(
    sessionId: string,
    userId: string,
    active: ActiveMembership | null,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const refreshToken = this.tokens.newRefreshToken();
    await this.sessions.create({
      familyId: sessionId,
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      userId,
      activeTenantId: active?.tenantId ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    const accessToken = await this.accessToken(sessionId, userId, active);
    return { accessToken, refreshToken };
  }
}
