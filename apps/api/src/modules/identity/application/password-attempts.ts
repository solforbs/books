import { Injectable } from "@nestjs/common";
import { secondsUntilUnlock } from "../domain/auth-policy";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { UsersRepository } from "../infrastructure/users.repository";

export type AttemptResult =
  | { outcome: "ok" }
  | { outcome: "wrong"; lockedNow: boolean }
  | { outcome: "locked"; retryAfterSeconds: number };

/**
 * Password check with the 5-strikes lockout, shared by login and
 * change-password (security review M2, L3). The attempt is counted atomically
 * before argon2 runs, so at most MAX_FAILED_LOGINS guesses are ever verified
 * per lockout window, however many requests arrive in parallel.
 */
@Injectable()
export class PasswordAttempts {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async check(userId: string, password: string, now = new Date()): Promise<AttemptResult> {
    const reserved = await this.users.reserveLoginAttempt(userId, now);
    if (!reserved) {
      return { outcome: "locked", retryAfterSeconds: await this.lockSeconds(userId, now) };
    }

    if (await this.hasher.verify(reserved.user.passwordHash, password)) {
      await this.users.clearFailedLogins(userId);
      return { outcome: "ok" };
    }
    return { outcome: "wrong", lockedNow: reserved.lockedNow };
  }

  private async lockSeconds(userId: string, now: Date): Promise<number> {
    const user = await this.users.findById(userId);
    // The lock may have lifted between the two reads; still report a short wait.
    return Math.max(1, user?.lockedUntil ? secondsUntilUnlock(user.lockedUntil, now) : 1);
  }
}
