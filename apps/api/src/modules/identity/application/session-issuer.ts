import { Injectable } from "@nestjs/common";
import type { RequestMeta } from "../../../common/security/request-meta";
import type { ActiveMembership } from "../domain/active-tenant";
import { refreshExpiry } from "../domain/auth-policy";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";

/** A login's refresh-token family: its id (`sid`) and when the login happened. */
export interface SessionFamily {
  id: string;
  startedAt: Date;
}

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
    const family = { id: this.tokens.newSessionId(), startedAt: new Date() };
    return this.issue(family, userId, active, meta);
  }

  /** Next token in an existing family (refresh rotation); keeps the family's start time. */
  rotate(
    family: SessionFamily,
    userId: string,
    active: ActiveMembership | null,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    return this.issue(family, userId, active, meta);
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
    family: SessionFamily,
    userId: string,
    active: ActiveMembership | null,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const refreshToken = this.tokens.newRefreshToken();
    await this.sessions.create({
      familyId: family.id,
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      userId,
      activeTenantId: active?.tenantId ?? null,
      familyStartedAt: family.startedAt,
      expiresAt: refreshExpiry(family.startedAt, new Date()),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    const accessToken = await this.accessToken(family.id, userId, active);
    return { accessToken, refreshToken };
  }
}
