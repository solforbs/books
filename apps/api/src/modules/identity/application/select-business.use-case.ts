import { Injectable } from "@nestjs/common";
import type { SessionResponse } from "@books/shared";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import type { AuthContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";
import { MembershipsRepository } from "../infrastructure/memberships.repository";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { UsersRepository } from "../infrastructure/users.repository";
import { SessionIssuer } from "./session-issuer";
import { SessionView } from "./session-view";

/**
 * Switches the session to one of the caller's businesses. For that business it
 * counts as a login: it gets a login-history entry and its "last login" moves.
 */
@Injectable()
export class SelectBusinessUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly memberships: MembershipsRepository,
    private readonly sessions: RefreshSessionsRepository,
    private readonly issuer: SessionIssuer,
    private readonly view: SessionView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    auth: AuthContext,
    tenantId: string,
    meta: RequestMeta,
  ): Promise<{ response: SessionResponse; accessToken: string }> {
    const user = await this.users.findById(auth.userId);
    if (!user || user.status !== "active") throw IdentityErrors.sessionExpired();

    const memberships = await this.view.membershipsOf(auth.userId);
    const chosen = memberships.find((m) => m.tenantId === tenantId);
    if (!chosen) throw IdentityErrors.notAMember();

    // Remembered on the refresh session so the choice survives token rotation.
    await this.sessions.setActiveTenant(auth.sessionId, tenantId);
    const accessToken = await this.issuer.accessToken(auth.sessionId, auth.userId, chosen);
    await this.memberships.touchLastLogin(auth.userId, tenantId, new Date());
    await this.audit.record({
      action: "login",
      outcome: "success",
      reason: "business_selected",
      userId: auth.userId,
      tenantId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { response: this.view.build(user, memberships, tenantId), accessToken };
  }
}
