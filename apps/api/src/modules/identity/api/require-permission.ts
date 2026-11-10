import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { effectivePermissions, type Permission } from "@books/shared";
import { forbidden } from "../../../common/errors/app-error";
import { RequireTenantGuard } from "./require-tenant.guard";

const PERMISSIONS_KEY = "books:required-permissions";

export const forbiddenError = () => forbidden("forbidden", "You are not allowed to do this");

/**
 * Runs after RequireTenantGuard, so it sees the membership read from the
 * database on this very request (role + per-person switches), never the token.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const access = context.switchToHttp().getRequest<FastifyRequest>().tenantAccess;
    if (!access) throw new Error("PermissionGuard needs RequireTenantGuard first");
    const granted = effectivePermissions(access.role, access.permissionOverrides);
    if (!required.every((p) => granted.has(p))) throw forbiddenError();
    return true;
  }
}

/**
 * `@RequirePermission("manage_locations")`: needs a selected business, an active
 * membership and every listed permission; otherwise 403 `forbidden`.
 */
export const RequirePermission = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(RequireTenantGuard, PermissionGuard),
  );
