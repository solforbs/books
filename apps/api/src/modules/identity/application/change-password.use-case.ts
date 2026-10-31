import { Injectable } from "@nestjs/common";
import { isStrongPassword, type changePasswordRequestSchema } from "@books/shared";
import type { z } from "zod";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import type { AuthContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { UsersRepository } from "../infrastructure/users.repository";

export type ChangePasswordInput = z.output<typeof changePasswordRequestSchema>;

/**
 * Also used for the forced first-login change of a temporary password.
 * Every other session of the user is signed out; this one stays.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: RefreshSessionsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(auth: AuthContext, input: ChangePasswordInput, meta: RequestMeta): Promise<void> {
    const user = await this.users.findById(auth.userId);
    if (!user || user.status !== "active") throw IdentityErrors.sessionExpired();

    if (!(await this.hasher.verify(user.passwordHash, input.currentPassword))) {
      await this.audit.record({
        action: "change_password",
        outcome: "failure",
        reason: "wrong_current_password",
        userId: auth.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw IdentityErrors.wrongCurrentPassword();
    }
    // Refuse passwords built from the person's own name or email (policy "too_common").
    const personal = [user.name, ...user.name.split(/\s+/), user.email?.split("@")[0] ?? ""];
    if (!isStrongPassword(input.newPassword, personal)) throw IdentityErrors.weakPassword();

    await this.users.setPassword(auth.userId, await this.hasher.hash(input.newPassword));
    await this.sessions.revokeAllForUser(auth.userId, auth.sessionId);
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
