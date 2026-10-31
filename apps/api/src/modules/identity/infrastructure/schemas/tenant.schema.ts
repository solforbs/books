import { Schema, type Types } from "mongoose";

export const TENANT_MODEL = "Tenant";

/** A business. Its `_id` is the `tenantId` stamped on every tenant-owned document. */
export interface TenantDoc {
  _id: Types.ObjectId;
  name: string;
  status: "active" | "disabled";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const tenantSchema = new Schema<TenantDoc>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { collection: "tenants", timestamps: true, versionKey: false },
);
