import { Schema, type Types } from "mongoose";

export const RECOVERY_CODE_MODEL = "RecoveryCode";

/** One-time account recovery code. Only the SHA-256 hash is stored. */
export interface RecoveryCodeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

export const recoveryCodeSchema = new Schema<RecoveryCodeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    codeHash: { type: String, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    collection: "recovery_codes",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);
recoveryCodeSchema.index({ userId: 1, codeHash: 1 }, { unique: true });
