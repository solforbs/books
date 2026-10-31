import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { IS_PUBLIC_KEY } from "../../../common/security/public.decorator";
import { IdentityErrors } from "../domain/identity-errors";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";
import { AuthCookies } from "./auth-cookies";

/**
 * Global guard: every route needs a valid access cookie unless marked
 * `@Public()`. The session behind the token must still be active, so logout,
 * password change and token-theft detection cut access immediately.
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
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

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
    if (!(await this.sessions.isFamilyActive(claims.sid, new Date()))) {
      throw IdentityErrors.sessionExpired();
    }
    req.auth = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
      sessionId: claims.sid,
    };
    return true;
  }
}
