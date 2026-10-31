import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { isObjectIdString, toObjectId } from "../../../common/database/object-id";
import { LOCKOUT_MS, MAX_FAILED_LOGINS, isLocked } from "../domain/auth-policy";
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

  /**
   * Reserves one password attempt BEFORE the hash is checked, atomically, so
   * parallel guesses cannot all slip past the limit (security review M2).
   * Only matches an unlocked user; the MAX-th reservation locks the account
   * (and restarts the count for after the lock). Returns null when the account
   * is locked, otherwise the user and whether this attempt locked it.
   * A correct password then clears the count via `clearFailedLogins`.
   */
  async reserveLoginAttempt(
    id: string,
    now: Date,
  ): Promise<{ user: UserDoc; lockedNow: boolean } | null> {
    if (!isObjectIdString(id)) return null;
    const reachedMax = { $gte: ["$failedLoginCount", MAX_FAILED_LOGINS] };
    const user = await this.model
      .findOneAndUpdate(
        { _id: toObjectId(id), $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
        [
          { $set: { failedLoginCount: { $add: [{ $ifNull: ["$failedLoginCount", 0] }, 1] } } },
          {
            $set: {
              lockedUntil: { $cond: [reachedMax, new Date(now.getTime() + LOCKOUT_MS), null] },
              failedLoginCount: { $cond: [reachedMax, 0, "$failedLoginCount"] },
            },
          },
        ],
        { new: true },
      )
      .lean<UserDoc>()
      .exec();
    return user ? { user, lockedNow: isLocked(user.lockedUntil, now) } : null;
  }

  /** A correct password: forget failed attempts and lift a lock this attempt caused. */
  async clearFailedLogins(id: string): Promise<void> {
    await this.model
      .updateOne({ _id: toObjectId(id) }, { $set: { failedLoginCount: 0, lockedUntil: null } })
      .exec();
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
