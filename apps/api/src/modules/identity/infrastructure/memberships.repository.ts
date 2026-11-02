import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import type { PermissionOverrides, Role } from "@books/shared";
import { DB, type Database, type Executor } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { memberships, type MembershipRow } from "./tables/memberships.table";
import { users, type UserRow } from "./tables/users.table";

export type MembershipUpdate = Partial<
  Pick<MembershipRow, "role" | "status" | "permissionOverrides">
>;

/** A membership together with the person it belongs to. */
export interface MemberRecord {
  membership: MembershipRow;
  user: UserRow;
}

/**
 * Memberships are the one place where reading across tenants is legitimate:
 * it is how we find which businesses a person belongs to. Every query here is
 * keyed by the user or by one business, never "all memberships".
 */
@Injectable()
export class MembershipsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(
    userId: string,
    tenantId: string,
    role: Role,
    tx: Executor,
    permissionOverrides: PermissionOverrides = {},
  ): Promise<MembershipRow> {
    const [created] = await tx
      .insert(memberships)
      .values({ userId, tenantId, role, permissionOverrides })
      .returning();
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

  /** Any membership (active or switched off) of this user in this business. */
  async findForUser(
    userId: string,
    tenantId: string,
    tx: Executor = this.db,
  ): Promise<MembershipRow | null> {
    if (!isUuid(userId) || !isUuid(tenantId)) return null;
    const [row] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
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

  /** Every membership of the user, in any business and status. */
  async countForUser(userId: string, tx: Executor = this.db): Promise<number> {
    if (!isUuid(userId)) return 0;
    const rows = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    return rows.length;
  }

  /** One member of one business, with their user record. */
  async findMember(
    tenantId: string,
    membershipId: string,
    tx: Executor = this.db,
  ): Promise<MemberRecord | null> {
    if (!isUuid(tenantId) || !isUuid(membershipId)) return null;
    const [row] = await tx
      .select({ membership: memberships, user: users })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, membershipId)))
      .limit(1);
    return row ?? null;
  }

  /** Every member of one business (any status), oldest first. */
  async listMembers(tenantId: string, tx: Executor = this.db): Promise<MemberRecord[]> {
    if (!isUuid(tenantId)) return [];
    return tx
      .select({ membership: memberships, user: users })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(asc(memberships.createdAt), asc(memberships.id));
  }

  async update(
    tenantId: string,
    membershipId: string,
    set: MembershipUpdate,
    tx: Executor,
  ): Promise<MembershipRow | null> {
    const [row] = await tx
      .update(memberships)
      .set(set)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, membershipId)))
      .returning();
    return row ?? null;
  }

  /**
   * Locks the business's active owner memberships until the transaction ends and
   * returns their ids, so two owners switching each other off at the same moment
   * cannot leave the business without an owner (`last_owner`).
   */
  async lockActiveOwners(tenantId: string, tx: Executor): Promise<string[]> {
    const rows = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.role, "owner"),
          eq(memberships.status, "active"),
        ),
      )
      .for("update");
    return rows.map((r) => r.id);
  }
}
