import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { DB, type Database, type Executor } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { refreshSessions, type RefreshSessionRow } from "./tables/refresh-sessions.table";

export interface NewRefreshSession {
  familyId: string;
  tokenHash: string;
  userId: string;
  activeTenantId: string | null;
  familyStartedAt: Date;
  expiresAt: Date;
  userAgent: string;
  ip: string;
}

@Injectable()
export class RefreshSessionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(s: NewRefreshSession, tx: Executor = this.db): Promise<void> {
    await tx.insert(refreshSessions).values(s);
  }

  async findByHash(tokenHash: string): Promise<RefreshSessionRow | null> {
    const [row] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  /**
   * Atomic single use: only one caller can turn an active token into `used`.
   * Parallel callers queue on the row lock and then no longer match.
   */
  async markUsed(tokenHash: string, tx: Executor = this.db): Promise<boolean> {
    const used = await tx
      .update(refreshSessions)
      .set({ status: "used", usedAt: new Date() })
      .where(and(eq(refreshSessions.tokenHash, tokenHash), eq(refreshSessions.status, "active")))
      .returning({ id: refreshSessions.id });
    return used.length === 1;
  }

  async isFamilyActive(familyId: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.familyId, familyId),
          eq(refreshSessions.status, "active"),
          gt(refreshSessions.expiresAt, now),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** Revocation flips every token of a family (used ones too) to `revoked`. */
  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .where(and(eq(refreshSessions.familyId, familyId), eq(refreshSessions.status, "revoked")))
      .limit(1);
    return rows.length > 0;
  }

  async setActiveTenant(familyId: string, tenantId: string): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ activeTenantId: tenantId })
      .where(and(eq(refreshSessions.familyId, familyId), eq(refreshSessions.status, "active")));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(and(eq(refreshSessions.familyId, familyId), ne(refreshSessions.status, "revoked")));
  }

  /** Signs the user out everywhere, optionally keeping the current session. */
  async revokeAllForUser(
    userId: string,
    exceptFamilyId?: string,
    tx: Executor = this.db,
  ): Promise<void> {
    if (!isUuid(userId)) return;
    await tx
      .update(refreshSessions)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          ne(refreshSessions.status, "revoked"),
          exceptFamilyId ? ne(refreshSessions.familyId, exceptFamilyId) : undefined,
        ),
      );
  }

  /**
   * Deletes rows a week past `expires_at` through the SECURITY DEFINER function
   * from the migrations (the app role itself has no DELETE privilege).
   */
  async purgeExpired(): Promise<number> {
    const res = await this.db.execute<{ purged: number }>(
      sql`select purge_expired_refresh_sessions() as purged`,
    );
    return res.rows[0]?.purged ?? 0;
  }
}
