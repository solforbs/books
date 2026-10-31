import { Schema, type InferSchemaType, type Types } from "mongoose";

export const AUDIT_ENTRY_MODEL = "AuditEntry";

/**
 * Append-only who-did-what log (G4). Never holds passwords, tokens or full
 * phone numbers: identifiers are masked before they get here.
 */
export const auditEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    outcome: { type: String, enum: ["success", "failure"], required: true },
    tenantId: { type: Schema.Types.ObjectId, default: null },
    userId: { type: Schema.Types.ObjectId, default: null },
    identifierMasked: { type: String, default: null },
    reason: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { collection: "audit_log", versionKey: false },
);
auditEntrySchema.index({ tenantId: 1, at: -1 });
auditEntrySchema.index({ userId: 1, at: -1 });

export type AuditEntryDoc = InferSchemaType<typeof auditEntrySchema> & { _id: Types.ObjectId };
