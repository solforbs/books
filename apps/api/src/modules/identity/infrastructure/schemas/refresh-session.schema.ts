import { Schema, type Types } from "mongoose";

export const REFRESH_SESSION_MODEL = "RefreshSession";

/**
 * One document per refresh token. Every token issued from the same login shares
 * a `familyId` (the session id, `sid` in the access token). A token is used once:
 * rotation marks it `used`; presenting a `used` token again means it was stolen,
 * so the whole family is revoked.
 */
export interface RefreshSessionDoc {
  _id: Types.ObjectId;
  familyId: string;
  /** HMAC-SHA256 of the opaque token; the token itself is never stored. */
  tokenHash: string;
  userId: Types.ObjectId;
  activeTenantId: Types.ObjectId | null;
  status: "active" | "used" | "revoked";
  expiresAt: Date;
  userAgent: string;
  ip: string;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export const refreshSessionSchema = new Schema<RefreshSessionDoc>(
  {
    familyId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    activeTenantId: { type: Schema.Types.ObjectId, default: null },
    status: { type: String, enum: ["active", "used", "revoked"], default: "active" },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  {
    collection: "refresh_sessions",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);
refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ familyId: 1, status: 1 });
refreshSessionSchema.index({ userId: 1, status: 1 });
