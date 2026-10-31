import { Schema, type Types } from "mongoose";
import { ROLES, type Role } from "@books/shared";

export const MEMBERSHIP_MODEL = "Membership";

/** Links a user to a business with a role. Switched off, never deleted (G4). */
export interface MembershipDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
  role: Role;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

export const membershipSchema = new Schema<MembershipDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { collection: "memberships", timestamps: true, versionKey: false },
);
membershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
membershipSchema.index({ tenantId: 1, status: 1 });
