import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
  applyDecorators,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { TenantAccess } from "../application/tenant-access";
import { IdentityErrors } from "../domain/identity-errors";

/**
 * Rejects requests whose session has not picked a business yet, and requests
 * from someone who is no longer an active member of it. The role is taken from
 * the membership record, never from the access token.
 */
@Injectable()
export class RequireTenantGuard implements CanActivate {
  constructor(private readonly access: TenantAccess) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    if (!req.auth) throw IdentityErrors.notAuthenticated();
    const { userId, tenantId } = req.auth;
    if (!tenantId) throw IdentityErrors.businessNotSelected();

    const access = await this.access.accessOf(userId, tenantId);
    if (!access) throw IdentityErrors.notAMember();
    req.auth = { ...req.auth, role: access.role };
    req.tenantAccess = access;
    return true;
  }
}

/**
 * Put on every controller of tenant-owned data (catalog, sales, ...):
 * `@RequireTenant()` then read the id with `@CurrentTenant()`, the verified
 * role with `@CurrentRole()`, or everything with `@CurrentAccess()`.
 * Routes that need a permission use `@RequirePermission(...)` instead.
 */
export const RequireTenant = () => applyDecorators(UseGuards(RequireTenantGuard));
