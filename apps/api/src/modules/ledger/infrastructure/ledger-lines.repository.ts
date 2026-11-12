import { Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { ledgerLines, type LedgerAccount } from "./tables/ledger-lines.table";

export interface NewLedgerLine {
  entryId: string;
  account: LedgerAccount;
  supplierId: string | null;
  moneyPlaceId: string | null;
  amountCents: number;
}

const sumKes = sql<string>`coalesce(sum(${ledgerLines.amountKesCents}), 0)`;

@Injectable()
export class LedgerLinesRepository extends TenantScopedRepository<typeof ledgerLines> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, ledgerLines);
  }

  insertMany(tenantId: string, rows: NewLedgerLine[], within: TenantTx): Promise<void> {
    return this.run(
      tenantId,
      async (tx) => {
        await tx.insert(ledgerLines).values(
          rows.map((r) => ({
            ...r,
            tenantId,
            currency: "KES" as const,
            amountKesCents: r.amountCents,
          })),
        );
      },
      within,
    );
  }

  /** Sum of the signed KES amounts per money place (debits in, credits out). */
  async moneyPlaceSums(
    tenantId: string,
    placeIds: string[],
    within?: TenantTx,
  ): Promise<Map<string, number>> {
    const ids = placeIds.filter(isUuid);
    if (ids.length === 0) return new Map();
    const rows = await this.run(
      tenantId,
      (tx) =>
        tx
          .select({ id: ledgerLines.moneyPlaceId, sum: sumKes })
          .from(ledgerLines)
          .where(
            this.scope(
              tenantId,
              and(eq(ledgerLines.account, "money_place"), inArray(ledgerLines.moneyPlaceId, ids)),
            ),
          )
          .groupBy(ledgerLines.moneyPlaceId),
      within,
    );
    return new Map(rows.map((r) => [r.id!, Number(r.sum)]));
  }

  /** Sum of the signed KES amounts of one supplier's payable account (credits are negative). */
  async supplierPayableSum(
    tenantId: string,
    supplierId: string,
    within?: TenantTx,
  ): Promise<number> {
    if (!isUuid(supplierId)) return 0;
    const [row] = await this.run(
      tenantId,
      (tx) =>
        tx
          .select({ sum: sumKes })
          .from(ledgerLines)
          .where(
            this.scope(
              tenantId,
              and(
                eq(ledgerLines.account, "supplier_payable"),
                eq(ledgerLines.supplierId, supplierId),
              ),
            ),
          ),
      within,
    );
    return Number(row?.sum ?? 0);
  }

  /** Sum of the whole inventory account (stock value at cost). */
  async inventorySum(tenantId: string, within?: TenantTx): Promise<number> {
    const [row] = await this.run(
      tenantId,
      (tx) =>
        tx
          .select({ sum: sumKes })
          .from(ledgerLines)
          .where(this.scope(tenantId, eq(ledgerLines.account, "inventory"))),
      within,
    );
    return Number(row?.sum ?? 0);
  }
}
