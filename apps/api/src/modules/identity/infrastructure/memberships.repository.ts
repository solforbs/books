import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { Role } from "@books/shared";
import { DB, type Database, type Executor } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { memberships, type MembershipRow } from "./tables/memberships.table";

/**
 * Memberships are the one place where reading across tenants is legitimate:
 * it is how we find which businesses a person belongs to. Every query here is
 * keyed by the user, never "all memberships".
 */
@Injectable()
export class MembershipsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(userId: string, tenantId: string, role: Role, tx: Executor): Promise<MembershipRow> {
    const [created] = await tx.insert(memberships).values({ userId, tenantId, role }).returning();
    return created!;
  }

  /** The caller's active membership in one business, or null. */
  async findActive(userId: string, tenantId: string): Promise<MembershipRow | null> {
    if (!isUuid(userId) || !isUuid(tenantId)) return null;
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.tenantId, tenantId),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findActiveForUser(userId: string): Promise<MembershipRow[]> {
    if (!isUuid(userId)) return [];
    return this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
      .orderBy(asc(memberships.createdAt), asc(memberships.id));
  }
}
