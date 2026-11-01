import { Inject, Injectable } from "@nestjs/common";
import { isStrongPassword, type recoverRequestSchema } from "@books/shared";
import type { z } from "zod";
import { DB, type Database } from "../../../common/database/database.types";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { normalizeRecoveryCode } from "../domain/recovery-codes";
import { IdentityErrors } from "../domain/identity-errors";
import { personalWords } from "../domain/personal-words";
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
    @Inject(DB) private readonly db: Database,
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

    const userId = user.id;
    const codeHash = this.tokens.hashRecoveryCode(normalizeRecoveryCode(input.recoveryCode));
    // Name/email words are only judged once the code proved who is asking, so a
    // weak_password answer never tells a stranger that this identifier exists.
    const weak = !isStrongPassword(input.newPassword, personalWords(user));
    const outcome = await this.db.transaction(async (tx) => {
      if (!(await this.codes.consume(userId, codeHash, tx))) return "invalid_code" as const;
      // Throwing aborts the transaction, so the code stays unused for a retry.
      if (weak) throw IdentityErrors.weakPassword();
      await this.users.setPassword(userId, newHash, tx);
      await this.sessions.revokeAllForUser(userId, undefined, tx);
      return "ok" as const;
    });
    if (outcome !== "ok") throw await fail(outcome, userId);

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
