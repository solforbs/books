import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { IS_PUBLIC_KEY } from "../../../common/security/public.decorator";
import { IdentityErrors } from "../domain/identity-errors";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";
import { ALLOW_PENDING_PASSWORD_CHANGE_KEY } from "./allow-pending-password-change";
import { AuthCookies } from "./auth-cookies";

/**
 * Global guard: every route needs a valid access cookie unless marked
 * `@Public()`. The session behind the token must still be active, so logout,
 * password change and token-theft detection cut access immediately.
 *
 * While the person still has to change a temporary password, only routes marked
 * `@AllowPendingPasswordChange()` work; everything else is 403
 * `password_change_required` (S1a review #6). Read from the database on every
 * request, so changing the password unlocks the same session at once.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: RefreshSessionsRepository,
    private readonly cookies: AuthCookies,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.cookies.readAccess(req);
    if (!token) throw IdentityErrors.notAuthenticated();

    const verified = await this.tokens.verifyAccess(token);
    if (!verified.ok) {
      throw verified.reason === "expired"
        ? IdentityErrors.sessionExpired()
        : IdentityErrors.notAuthenticated();
    }
    const { claims } = verified;
    const session = await this.sessions.activeSessionState(claims.sid, new Date());
    if (!session) throw IdentityErrors.sessionExpired();
    if (
      session.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_CHANGE_KEY, targets)
    ) {
      throw IdentityErrors.passwordChangeRequired();
    }
    req.auth = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      // Filled from the membership record by RequireTenantGuard (security review M3).
      role: null,
      sessionId: claims.sid,
    };
    return true;
  }
}
