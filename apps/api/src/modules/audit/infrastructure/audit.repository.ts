import { Inject, Injectable } from "@nestjs/common";
import { DB, type Database } from "../../../common/database/database.types";
import { auditLog, type NewAuditEntry } from "./audit-log.table";

/** Append-only: insert only (the app role has no UPDATE or DELETE on the table). */
@Injectable()
export class AuditRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async insert(entry: Omit<NewAuditEntry, "id" | "at">): Promise<void> {
    await this.db.insert(auditLog).values(entry);
  }
}
