import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { toObjectId } from "../../../common/database/object-id";
import { RECOVERY_CODE_MODEL, type RecoveryCodeDoc } from "./schemas/recovery-code.schema";

@Injectable()
export class RecoveryCodesRepository {
  constructor(@InjectModel(RECOVERY_CODE_MODEL) private readonly model: Model<RecoveryCodeDoc>) {}

  async createMany(userId: string, codeHashes: string[], session: ClientSession): Promise<void> {
    const uid = toObjectId(userId);
    await this.model.insertMany(
      codeHashes.map((codeHash) => ({ userId: uid, codeHash })),
      { session },
    );
  }

  /** Atomically marks an unused code as used. Returns false if it was unknown or already used. */
  async consume(userId: string, codeHash: string, session: ClientSession): Promise<boolean> {
    const res = await this.model
      .updateOne(
        { userId: toObjectId(userId), codeHash, usedAt: null },
        { $set: { usedAt: new Date() } },
        { session },
      )
      .exec();
    return res.modifiedCount === 1;
  }
}
