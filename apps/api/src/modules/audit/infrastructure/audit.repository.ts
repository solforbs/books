import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { AUDIT_ENTRY_MODEL, type AuditEntryDoc } from "./audit-entry.schema";

/** Append-only: insert and read, never update or delete. */
@Injectable()
export class AuditRepository {
  constructor(@InjectModel(AUDIT_ENTRY_MODEL) private readonly model: Model<AuditEntryDoc>) {}

  async insert(entry: Omit<AuditEntryDoc, "_id" | "at">): Promise<void> {
    await this.model.create(entry);
  }
}
