import { Types } from "mongoose";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function isObjectIdString(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

/** Converts a trusted id string; throws on garbage so bugs surface loudly. */
export function toObjectId(value: string | Types.ObjectId): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  if (!isObjectIdString(value)) throw new Error("Invalid ObjectId");
  return new Types.ObjectId(value);
}
