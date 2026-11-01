import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { DB, type Database, type Executor } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { LOCKOUT_MS, MAX_FAILED_LOGINS, isLocked } from "../domain/auth-policy";
import { users, type UserRow } from "./tables/users.table";

export interface NewUser {
  name: string;
  passwordHash: string;
  language: UserRow["language"];
  phone?: string;
  email?: string;
  mustChangePassword?: boolean;
}

/** Users are global records (a person may work for several businesses). */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string, tx: Executor = this.db): Promise<UserRow | null> {
    if (!isUuid(id)) return null;
    const [row] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  /** `identifier` is already normalised (phone E.164, email lower-case) by `identifierSchema`. */
  async findByIdentifier(identifier: string): Promise<UserRow | null> {
    const match = identifier.includes("@")
      ? eq(users.email, identifier)
      : eq(users.phone, identifier);
    const [row] = await this.db.select().from(users).where(match).limit(1);
    return row ?? null;
  }

  async existsWith(phone: string | undefined, email: string | undefined): Promise<boolean> {
    const matches = [
      ...(phone ? [eq(users.phone, phone)] : []),
      ...(email ? [eq(users.email, email)] : []),
    ];
    if (matches.length === 0) return false;
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(or(...matches))
      .limit(1);
    return rows.length > 0;
  }

  /** Throws a unique violation (23505) when the phone or email is taken. */
  async create(user: NewUser, tx: Executor): Promise<UserRow> {
    const [created] = await tx
      .insert(users)
      .values({ ...user, phone: user.phone ?? null, email: user.email ?? null })
      .returning();
    return created!;
  }

  /**
   * Reserves one password attempt BEFORE the hash is checked, in one atomic
   * UPDATE, so parallel guesses cannot all slip past the limit (security
   * review M2): concurrent UPDATEs of the row queue up, and each re-checks the
   * lock condition against the row the previous one committed. Only matches an
   * unlocked user; the MAX-th reservation locks the account (and restarts the
   * count for after the lock). Returns null when the account is locked,
   * otherwise the user and whether this attempt locked it. A correct password
   * then clears the count via `clearFailedLogins`.
   */
  async reserveLoginAttempt(
    id: string,
    now: Date,
  ): Promise<{ user: UserRow; lockedNow: boolean } | null> {
    if (!isUuid(id)) return null;
    // Both SET expressions see the row as it was before this UPDATE.
    const reachedMax = sql`${users.failedLoginCount} + 1 >= ${MAX_FAILED_LOGINS}`;
    const lockUntil = new Date(now.getTime() + LOCKOUT_MS);
    const [user] = await this.db
      .update(users)
      .set({
        failedLoginCount: sql`case when ${reachedMax} then 0 else ${users.failedLoginCount} + 1 end`,
        lockedUntil: sql`case when ${reachedMax} then ${lockUntil.toISOString()}::timestamptz else null end`,
      })
      .where(and(eq(users.id, id), or(isNull(users.lockedUntil), lte(users.lockedUntil, now))))
      .returning();
    return user ? { user, lockedNow: isLocked(user.lockedUntil, now) } : null;
  }

  /** A correct password: forget failed attempts and lift a lock this attempt caused. */
  async clearFailedLogins(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, id));
  }

  async registerSuccessfulLogin(id: string, now: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now })
      .where(eq(users.id, id));
  }

  /** New password also clears the must-change flag and any lockout. */
  async setPassword(id: string, passwordHash: string, tx: Executor = this.db): Promise<void> {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, id));
  }
}
