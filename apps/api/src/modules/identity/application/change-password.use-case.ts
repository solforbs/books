import { Inject, Injectable } from "@nestjs/common";
import { isStrongPassword, type changePasswordRequestSchema } from "@books/shared";
import type { z } from "zod";
import { DB, type Database } from "../../../common/database/database.types";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import type { AuthContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";
import { personalWords } from "../domain/personal-words";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { UsersRepository } from "../infrastructure/users.repository";
import { PasswordAttempts } from "./password-attempts";

export type ChangePasswordInput = z.output<typeof changePasswordRequestSchema>;

/**
 * Also used for the forced first-login change of a temporary password.
 * Every other session of the user is signed out; this one stays.
 * Wrong current passwords count toward the same lockout as login, so a stolen
 * session cannot be used to guess the password (security review L3).
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly attempts: PasswordAttempts,
    private readonly sessions: RefreshSessionsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(auth: AuthContext, input: ChangePasswordInput, meta: RequestMeta): Promise<void> {
    const user = await this.users.findById(auth.userId);
    if (!user || user.status !== "active") throw IdentityErrors.sessionExpired();

    const attempt = await this.attempts.check(auth.userId, input.currentPassword);
    if (attempt.outcome !== "ok") {
      await this.audit.record({
        action: "change_password",
        outcome: "failure",
        reason: attempt.outcome === "locked" ? "locked" : "wrong_current_password",
        userId: auth.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      if (attempt.outcome === "locked") {
        throw IdentityErrors.accountLocked(attempt.retryAfterSeconds);
      }
      throw IdentityErrors.wrongCurrentPassword();
    }
    // Refuse passwords built from the person's own name or email (policy "too_common").
    if (!isStrongPassword(input.newPassword, personalWords(user))) {
      throw IdentityErrors.weakPassword();
    }

    const newHash = await this.hasher.hash(input.newPassword);
    await this.db.transaction(async (tx) => {
      await this.users.setPassword(auth.userId, newHash, tx);
      await this.sessions.revokeAllForUser(auth.userId, auth.sessionId, tx);
    });
    await this.audit.record({
      action: "change_password",
      outcome: "success",
      userId: auth.userId,
      tenantId: auth.tenantId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}
