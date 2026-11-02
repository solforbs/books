import { Injectable, Logger } from "@nestjs/common";
import { isUuid } from "../../../common/database/uuid";
import { safeErrorMessage } from "../../../common/errors/safe-error-message";
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
  /** What the action was done to (location, money place, membership, ...). */
  targetId?: string | null;
  /** Before/after summary. `phone` / `email` values are masked before storage. */
  details?: Record<string, unknown>;
}

export interface LoginHistoryEntry {
  at: Date;
  outcome: "success" | "failure";
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
}

const MASKED_KEYS = new Set(["phone", "email"]);

/** Masks phone numbers and emails anywhere in a details object (house rule 10). */
export function maskDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskDetails);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      MASKED_KEYS.has(k) && typeof v === "string" ? maskIdentifier(v) : maskDetails(v),
    ]),
  );
}

/** Public interface of the audit module. Other modules call this, never the table. */
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
        tenantId: isUuid(event.tenantId) ? event.tenantId : null,
        userId: isUuid(event.userId) ? event.userId : null,
        identifierMasked: event.identifier ? maskIdentifier(event.identifier) : null,
        reason: event.reason ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        targetId: isUuid(event.targetId) ? event.targetId : null,
        details: event.details ? (maskDetails(event.details) as Record<string, unknown>) : null,
      });
    } catch (err) {
      this.logger.error(`audit write failed for ${event.action}: ${safeErrorMessage(err)}`);
    }
  }

  /**
   * A person's login attempts, newest first (F02 §6 login history). Only entries
   * that concern this business or no business (failed attempts carry none), so
   * an owner never sees the person's logins into other businesses.
   */
  loginHistory(userId: string, tenantId: string, limit = 100): Promise<LoginHistoryEntry[]> {
    return this.repo.loginHistory(userId, tenantId, limit);
  }
}
