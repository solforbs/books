import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
  applyDecorators,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { IdentityErrors } from "../domain/identity-errors";

/** Rejects requests whose session has not picked a business yet. */
@Injectable()
export class RequireTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    if (!req.auth) throw IdentityErrors.notAuthenticated();
    if (!req.auth.tenantId) throw IdentityErrors.businessNotSelected();
    return true;
  }
}

/**
 * Put on every controller of tenant-owned data (catalog, sales, ...):
 * `@RequireTenant()` then read the id with `@CurrentTenant()`.
 */
export const RequireTenant = () => applyDecorators(UseGuards(RequireTenantGuard));
