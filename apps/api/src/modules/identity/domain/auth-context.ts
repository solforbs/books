import type { Role } from "@books/shared";

/** Claims inside the 15-minute access JWT. */
export interface AccessTokenClaims {
  sub: string;
  tenantId: string | null;
  role: Role | null;
  /** Session (refresh-token family) id; lets logout and password changes cut access. */
  sid: string;
}

/** What a guarded route knows about the caller. */
export interface AuthContext {
  userId: string;
  tenantId: string | null;
  role: Role | null;
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
