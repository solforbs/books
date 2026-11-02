import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { DB, type Database } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { auditLog, type NewAuditEntry } from "./audit-log.table";

/** Append-only: insert only (the app role has no UPDATE or DELETE on the table). */
@Injectable()
export class AuditRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async insert(entry: Omit<NewAuditEntry, "id" | "at">): Promise<void> {
    await this.db.insert(auditLog).values(entry);
  }

  async loginHistory(userId: string, tenantId: string, limit: number) {
    if (!isUuid(userId) || !isUuid(tenantId)) return [];
    return this.db
      .select({
        at: auditLog.at,
        outcome: auditLog.outcome,
        reason: auditLog.reason,
        ip: auditLog.ip,
        userAgent: auditLog.userAgent,
      })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, userId),
          eq(auditLog.action, "login"),
          or(eq(auditLog.tenantId, tenantId), isNull(auditLog.tenantId)),
        ),
      )
      .orderBy(desc(auditLog.at))
      .limit(limit);
  }
}
