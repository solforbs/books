import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Role } from "@books/shared";
import type { FastifyRequest } from "fastify";
import type { AuthContext, TenantAccessContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";

/** The authenticated caller (set by AuthGuard). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (!req.auth) throw IdentityErrors.notAuthenticated();
    return req.auth;
  },
);

/** The membership RequireTenantGuard checked against the database for this request. */
function verifiedAccess(ctx: ExecutionContext): TenantAccessContext {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.auth) throw IdentityErrors.notAuthenticated();
  if (!req.auth.tenantId) throw IdentityErrors.businessNotSelected();
  // A programming error, not a client one: the route forgot @RequireTenant().
  if (!req.tenantAccess) throw new Error("@CurrentTenant()/@CurrentRole() need @RequireTenant()");
  return req.tenantAccess;
}

/** The active business id, verified by `@RequireTenant()`. */
export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => verifiedAccess(ctx).tenantId,
);

/** The caller's role in the active business, read from the database (never the token). */
export const CurrentRole = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Role => verifiedAccess(ctx).role,
);
