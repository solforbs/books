import type { Role } from "@books/shared";

/** Claims inside the 15-minute access JWT. */
export interface AccessTokenClaims {
  sub: string;
  tenantId: string | null;
  /** Informational only: authorisation always re-reads the membership (RequireTenantGuard). */
  role: Role | null;
  /** Session (refresh-token family) id; lets logout and password changes cut access. */
  sid: string;
}

/** What a guarded route knows about the caller. */
export interface AuthContext {
  userId: string;
  /** The business the session picked (from the token); not yet proof of membership. */
  tenantId: string | null;
  /**
   * null until RequireTenantGuard has loaded the membership from the database;
   * the token's role claim is never trusted.
   */
  role: Role | null;
  sessionId: string;
}

/** Set by RequireTenantGuard after checking the active membership in the database. */
export interface TenantAccessContext {
  tenantId: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
    tenantAccess?: TenantAccessContext;
  }
}
