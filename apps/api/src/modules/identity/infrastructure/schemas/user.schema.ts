import { Schema, type Types } from "mongoose";
import { LANGUAGES, type Language } from "@books/shared";

export const USER_MODEL = "User";

/** Users are global (not tenant-owned): one person can belong to several businesses. */
export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  /** E.164 (+2547XXXXXXXX), normalised by @books/shared. Absent when not given. */
  phone?: string;
  /** Lower-cased. Absent when not given. */
  email?: string;
  passwordHash: string;
  language: Language;
  mustChangePassword: boolean;
  status: "active" | "disabled";
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    passwordHash: { type: String, required: true },
    language: { type: String, enum: LANGUAGES, default: "en" },
    mustChangePassword: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { collection: "users", timestamps: true, versionKey: false },
);

// Unique only when present, so phone-only and email-only users can coexist.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
