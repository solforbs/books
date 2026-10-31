import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";

/** The authenticated caller (set by AuthGuard). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (!req.auth) throw IdentityErrors.notAuthenticated();
    return req.auth;
  },
);

/** The active business id. Throws `business_not_selected` when there is none. */
export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.auth) throw IdentityErrors.notAuthenticated();
  if (!req.auth.tenantId) throw IdentityErrors.businessNotSelected();
  return req.auth.tenantId;
});
