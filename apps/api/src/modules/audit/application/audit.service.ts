import { Injectable, Logger } from "@nestjs/common";
import { toObjectId } from "../../../common/database/object-id";
import { maskIdentifier } from "../../../common/security/mask";
import { AuditRepository } from "../infrastructure/audit.repository";

export interface AuditEvent {
  action: string;
  outcome: "success" | "failure";
  tenantId?: string | null;
  userId?: string | null;
  /** Raw phone/email; masked before storage. */
  identifier?: string | null;
  reason?: string;
  ip?: string;
  userAgent?: string;
}

/** Public interface of the audit module. Other modules call this, never the collection. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  /** Never throws: a failed audit write must not break sign-in, but it is logged. */
  async record(event: AuditEvent): Promise<void> {
    try {
      await this.repo.insert({
        action: event.action,
        outcome: event.outcome,
        tenantId: event.tenantId ? toObjectId(event.tenantId) : null,
        userId: event.userId ? toObjectId(event.userId) : null,
        identifierMasked: event.identifier ? maskIdentifier(event.identifier) : null,
        reason: event.reason ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
      });
    } catch (err) {
      this.logger.error(`audit write failed for ${event.action}: ${(err as Error).message}`);
    }
  }
}
