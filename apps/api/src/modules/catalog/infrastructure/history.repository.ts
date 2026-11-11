import { Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { productHistory, type HistoryRow } from "./tables/product-history.table";

export interface HistoryEntry {
  action: string;
  field?: string | null;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class HistoryRepository extends TenantScopedRepository<typeof productHistory> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, productHistory);
  }

  /** Appends entries (never updates: the app role has no UPDATE on this table). */
  async add(
    tenantId: string,
    productId: string,
    byUserId: string,
    entries: HistoryEntry[],
    within: TenantTx,
  ): Promise<void> {
    for (const e of entries) {
      await this.create(
        tenantId,
        {
          productId,
          byUserId,
          action: e.action,
          field: e.field ?? null,
          before: e.before ?? null,
          after: e.after ?? null,
        },
        within,
      );
    }
  }

  /** Newest first (by insertion order). */
  forProduct(tenantId: string, productId: string, limit = 500): Promise<HistoryRow[]> {
    return this.find(tenantId, eq(productHistory.productId, productId), {
      orderBy: [desc(productHistory.seq)],
      limit,
    });
  }
}
