import type { RequestMeta } from "../../../common/security/request-meta";
import type { TenantAccessContext } from "./auth-context";

/** Who is acting (verified membership) and from where: what every audited use case needs. */
export interface Actor {
  access: TenantAccessContext;
  meta: RequestMeta;
}

/** The audit fields every successful change by an actor shares. */
export function auditBase(actor: Actor) {
  return {
    outcome: "success" as const,
    tenantId: actor.access.tenantId,
    userId: actor.access.userId,
    ip: actor.meta.ip,
    userAgent: actor.meta.userAgent,
  };
}
