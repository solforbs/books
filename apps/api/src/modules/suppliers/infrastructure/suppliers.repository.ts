import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { suppliers, type SupplierRow, type SupplierStatus } from "./tables/suppliers.table";

/** Waiting and active suppliers: the default list (hidden ones only when asked for). */
export const SELECTABLE_STATUSES: SupplierStatus[] = ["waiting", "active"];

export interface SupplierSearch {
  q?: string;
  status?: SupplierStatus;
  neighbour: boolean;
  limit: number;
  cursor?: { nameKey: string; id: string };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Words of the search box: lower-case, at most 8, each must match somewhere. */
export function searchTokens(q: string | undefined): string[] {
  return (q ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

@Injectable()
export class SuppliersRepository extends TenantScopedRepository<typeof suppliers> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, suppliers);
  }

  /** Locks one supplier row for a read-check-write sequence. */
  async lockById(tenantId: string, id: string, within: TenantTx): Promise<SupplierRow | null> {
    if (!isUuid(id)) return null;
    return this.run(
      tenantId,
      async (tx) => {
        const [row] = await tx
          .select()
          .from(suppliers)
          .where(this.scope(tenantId, eq(suppliers.id, id)))
          .for("update");
        return row ?? null;
      },
      within,
    );
  }

  findManyByIds(tenantId: string, ids: string[], within?: TenantTx) {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(suppliers.id, valid),
      { orderBy: [asc(suppliers.nameKey), asc(suppliers.id)] },
      within,
    );
  }

  /** Another supplier (any status) with this exact normalised phone. */
  findByPhone(tenantId: string, phone: string, exceptId: string | null, within?: TenantTx) {
    const filters: SQL[] = [eq(suppliers.phone, phone)];
    if (exceptId) filters.push(ne(suppliers.id, exceptId));
    return this.findOne(tenantId, and(...filters), within);
  }

  /** Light rows of every supplier (any status), for the similar-name check. */
  namePool(tenantId: string, within?: TenantTx): Promise<{ id: string; name: string }[]> {
    return this.run(
      tenantId,
      (tx) =>
        tx
          .select({ id: suppliers.id, name: suppliers.name })
          .from(suppliers)
          .where(this.scope(tenantId)),
      within,
    );
  }

  /** One page, ordered by name. Fetches `limit + 1` to detect a next page. */
  search(tenantId: string, query: SupplierSearch, within?: TenantTx): Promise<SupplierRow[]> {
    const filters: SQL[] = [
      query.status
        ? eq(suppliers.status, query.status)
        : inArray(suppliers.status, SELECTABLE_STATUSES),
    ];
    if (query.neighbour) filters.push(eq(suppliers.isNeighbour, true));
    for (const token of searchTokens(query.q)) filters.push(matchesToken(token));
    if (query.cursor) {
      filters.push(
        sql`(${suppliers.nameKey}, ${suppliers.id}) > (${query.cursor.nameKey}, ${query.cursor.id}::uuid)`,
      );
    }
    return this.find(
      tenantId,
      and(...filters),
      { orderBy: [asc(suppliers.nameKey), asc(suppliers.id)], limit: query.limit + 1 },
      within,
    );
  }
}

/**
 * A word matches the name, the market/location, or the phone. For the phone, a number typed
 * the Kenyan way ("0712...") is looked up without its leading zero, as stored (+254712...).
 */
function matchesToken(token: string): SQL {
  const like = `%${escapeLike(token)}%`;
  const digits = /^0\d+$/.test(token) ? token.slice(1) : token.replace(/^\+/, "");
  const phoneLike = `%${escapeLike(digits)}%`;
  return sql`(${suppliers.nameKey} like ${like}
    or lower(coalesce(${suppliers.marketOrLocation}, '')) like ${like}
    or coalesce(${suppliers.phone}, '') like ${phoneLike})`;
}
