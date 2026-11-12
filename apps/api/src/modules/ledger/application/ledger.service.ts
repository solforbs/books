import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { assertBalanced, meaningfulLines, type LedgerLineInput } from "../domain/ledger-entry";
import { LedgerEntriesRepository } from "../infrastructure/ledger-entries.repository";
import { LedgerLinesRepository } from "../infrastructure/ledger-lines.repository";
import type { LedgerEntryType } from "../infrastructure/tables/ledger-entries.table";

export interface NewLedgerEntry {
  type: LedgerEntryType;
  createdByUserId: string;
  locationId: string | null;
  sourceType: string;
  sourceId: string;
  commandId: string;
  lines: LedgerLineInput[];
}

/**
 * Public interface of the ledger module (ARCH-02 section 2.2). Other modules post entries
 * and ask for balances here; balances are never typed, they are always sums of lines.
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly entries: LedgerEntriesRepository,
    private readonly lines: LedgerLinesRepository,
  ) {}

  /**
   * Writes one balanced entry inside the caller's transaction. Returns the entry id, or null
   * when every line was zero (nothing to record).
   */
  async post(t: TenantTx, entry: NewLedgerEntry): Promise<string | null> {
    const lines = meaningfulLines(entry.lines);
    if (lines.length === 0) return null;
    assertBalanced(lines);
    const row = await this.entries.create(
      t.tenantId,
      {
        type: entry.type,
        createdByUserId: entry.createdByUserId,
        locationId: entry.locationId,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        commandId: entry.commandId,
      },
      t,
    );
    await this.lines.insertMany(
      t.tenantId,
      lines.map((l) => ({
        entryId: row.id,
        account: l.account,
        supplierId: l.supplierId ?? null,
        moneyPlaceId: l.moneyPlaceId ?? null,
        amountCents: l.amountCents,
      })),
      t,
    );
    return row.id;
  }

  /** Balance in cents of each money place (places with no lines are 0). */
  async moneyPlaceBalances(
    tenantId: string,
    placeIds: string[],
    within?: TenantTx,
  ): Promise<Map<string, number>> {
    const sums = await this.lines.moneyPlaceSums(tenantId, placeIds, within);
    return new Map(placeIds.map((id) => [id, sums.get(id) ?? 0]));
  }

  async moneyPlaceBalance(tenantId: string, placeId: string, within?: TenantTx): Promise<number> {
    return (await this.moneyPlaceBalances(tenantId, [placeId], within)).get(placeId) ?? 0;
  }

  /** What the shop owes a supplier, in cents (positive = we owe). */
  async supplierOwed(tenantId: string, supplierId: string, within?: TenantTx): Promise<number> {
    return -(await this.lines.supplierPayableSum(tenantId, supplierId, within));
  }

  /** Stock value at cost according to the books. */
  inventoryValue(tenantId: string, within?: TenantTx): Promise<number> {
    return this.lines.inventorySum(tenantId, within);
  }
}
