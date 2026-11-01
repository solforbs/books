import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import type { Executor } from "../../../common/database/database.types";
import { recoveryCodes } from "./tables/recovery-codes.table";

@Injectable()
export class RecoveryCodesRepository {
  async createMany(userId: string, codeHashes: string[], tx: Executor): Promise<void> {
    await tx.insert(recoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })));
  }

  /**
   * Atomically marks an unused code as used. Returns false if it was unknown or
   * already used. A concurrent caller with the same code waits on the row lock
   * and then sees `used_at` set, so a code works exactly once.
   */
  async consume(userId: string, codeHash: string, tx: Executor): Promise<boolean> {
    const used = await tx
      .update(recoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(recoveryCodes.userId, userId),
          eq(recoveryCodes.codeHash, codeHash),
          isNull(recoveryCodes.usedAt),
        ),
      )
      .returning({ id: recoveryCodes.id });
    return used.length === 1;
  }
}
