import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { isObjectIdString, toObjectId } from "../../../common/database/object-id";
import { LOCKOUT_MS, MAX_FAILED_LOGINS } from "../domain/auth-policy";
import { USER_MODEL, type UserDoc } from "./schemas/user.schema";

export type NewUser = Pick<UserDoc, "name" | "passwordHash" | "language"> & {
  phone?: string;
  email?: string;
  mustChangePassword?: boolean;
};

/** Users are global records (a person may work for several businesses). */
@Injectable()
export class UsersRepository {
  constructor(@InjectModel(USER_MODEL) private readonly model: Model<UserDoc>) {}

  async findById(id: string, session?: ClientSession): Promise<UserDoc | null> {
    if (!isObjectIdString(id)) return null;
    return this.model
      .findById(id)
      .session(session ?? null)
      .lean<UserDoc>()
      .exec();
  }

  /** `identifier` is already normalised by the shared `identifierSchema`. */
  async findByIdentifier(identifier: string): Promise<UserDoc | null> {
    const filter = identifier.includes("@") ? { email: identifier } : { phone: identifier };
    return this.model.findOne(filter).lean<UserDoc>().exec();
  }

  async existsWith(phone: string | undefined, email: string | undefined): Promise<boolean> {
    const or = [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])];
    if (or.length === 0) return false;
    return (await this.model.exists({ $or: or })) !== null;
  }

  async create(user: NewUser, session: ClientSession): Promise<UserDoc> {
    const [created] = await this.model.create([user], { session });
    return created!.toObject();
  }

  /** Counts a failed login; on the MAX-th failure locks the account. Returns true if now locked. */
  async registerFailedLogin(id: string, now: Date): Promise<boolean> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $inc: { failedLoginCount: 1 } }, { new: true })
      .lean<UserDoc>()
      .exec();
    if (!updated || updated.failedLoginCount < MAX_FAILED_LOGINS) return false;
    await this.model
      .updateOne(
        { _id: toObjectId(id) },
        { $set: { lockedUntil: new Date(now.getTime() + LOCKOUT_MS), failedLoginCount: 0 } },
      )
      .exec();
    return true;
  }

  async registerSuccessfulLogin(id: string, now: Date): Promise<void> {
    await this.model
      .updateOne(
        { _id: toObjectId(id) },
        { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now } },
      )
      .exec();
  }

  /** New password also clears the must-change flag and any lockout. */
  async setPassword(id: string, passwordHash: string, session?: ClientSession): Promise<void> {
    await this.model
      .updateOne(
        { _id: toObjectId(id) },
        {
          $set: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
        },
      )
      .session(session ?? null)
      .exec();
  }
}
