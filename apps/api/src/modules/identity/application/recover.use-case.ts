import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import type { recoverRequestSchema } from "@books/shared";
import type { z } from "zod";
import { runInTransaction } from "../../../common/database/transaction";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { normalizeRecoveryCode } from "../domain/recovery-codes";
import { IdentityErrors } from "../domain/identity-errors";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { RecoveryCodesRepository } from "../infrastructure/recovery-codes.repository";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";
import { UsersRepository } from "../infrastructure/users.repository";

export type RecoverInput = z.output<typeof recoverRequestSchema>;

/**
 * Reset a forgotten password with one of the 10 one-time recovery codes.
 * Unknown user, wrong code and used code all give `invalid_recovery_code`.
 * The code, the new password and the sign-out of every session commit together.
 */
@Injectable()
export class RecoverUseCase {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly users: UsersRepository,
    private readonly codes: RecoveryCodesRepository,
    private readonly sessions: RefreshSessionsRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RecoverInput, meta: RequestMeta): Promise<void> {
    const user = await this.users.findByIdentifier(input.identifier);
    // Hash before looking at the user so both paths cost about the same.
    const newHash = await this.hasher.hash(input.newPassword);
    const fail = async (reason: string, userId: string | null) => {
      await this.audit.record({
        action: "recover",
        outcome: "failure",
        reason,
        userId,
        identifier: input.identifier,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return IdentityErrors.invalidRecoveryCode();
    };
    if (!user || user.status !== "active") throw await fail("unknown_user", null);

    const userId = user._id.toHexString();
    const codeHash = this.tokens.hashRecoveryCode(normalizeRecoveryCode(input.recoveryCode));
    const consumed = await runInTransaction(this.connection, async (session) => {
      if (!(await this.codes.consume(userId, codeHash, session))) return false;
      await this.users.setPassword(userId, newHash, session);
      await this.sessions.revokeAllForUser(userId, undefined, session);
      return true;
    });
    if (!consumed) throw await fail("invalid_code", userId);

    await this.audit.record({
      action: "recover",
      outcome: "success",
      userId,
      identifier: input.identifier,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}
