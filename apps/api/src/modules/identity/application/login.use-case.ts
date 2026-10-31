import { Injectable } from "@nestjs/common";
import type { SessionResponse, loginRequestSchema } from "@books/shared";
import type { z } from "zod";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { pickActiveMembership } from "../domain/active-tenant";
import { IdentityErrors } from "../domain/identity-errors";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { UsersRepository } from "../infrastructure/users.repository";
import { PasswordAttempts } from "./password-attempts";
import { SessionIssuer, type IssuedTokens } from "./session-issuer";
import { SessionView } from "./session-view";

export type LoginInput = z.output<typeof loginRequestSchema>;

/**
 * Phone-or-email + password login. Unknown user, wrong password and disabled
 * user all give the same `invalid_credentials` error after the same amount of
 * hashing work, so nobody can probe which numbers are registered. Lockout
 * counting is atomic and happens before the hash check (PasswordAttempts).
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly attempts: PasswordAttempts,
    private readonly issuer: SessionIssuer,
    private readonly view: SessionView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: LoginInput,
    meta: RequestMeta,
  ): Promise<{ response: SessionResponse; tokens: IssuedTokens }> {
    const now = new Date();
    const user = await this.users.findByIdentifier(input.identifier);
    const fail = (reason: string, userId?: string) =>
      this.audit.record({
        action: "login",
        outcome: "failure",
        reason,
        userId: userId ?? null,
        identifier: input.identifier,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

    if (!user || user.status !== "active") {
      // argon2 dominates both paths; the known-user path's one extra write is noise.
      await this.hasher.verifyAgainstDummy(input.password);
      await fail(user ? "user_disabled" : "unknown_user", user?._id.toHexString());
      throw IdentityErrors.invalidCredentials();
    }
    const userId = user._id.toHexString();
    const attempt = await this.attempts.check(userId, input.password, now);
    if (attempt.outcome === "locked") {
      await fail("locked", userId);
      throw IdentityErrors.accountLocked(attempt.retryAfterSeconds);
    }
    if (attempt.outcome === "wrong") {
      await fail(attempt.lockedNow ? "wrong_password_locked" : "wrong_password", userId);
      throw IdentityErrors.invalidCredentials();
    }

    await this.users.registerSuccessfulLogin(userId, now);
    const memberships = await this.view.membershipsOf(userId);
    const active = pickActiveMembership(memberships, null);
    const tokens = await this.issuer.start(userId, active, meta);
    await this.audit.record({
      action: "login",
      outcome: "success",
      userId,
      tenantId: active?.tenantId ?? null,
      identifier: input.identifier,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return {
      response: this.view.build(user, memberships, active?.tenantId ?? null),
      tokens,
    };
  }
}
