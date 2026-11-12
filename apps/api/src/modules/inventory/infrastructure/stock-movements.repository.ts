import { Injectable } from "@nestjs/common";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import {
  TenantScopedRepository,
  type TenantInsert,
} from "../../../common/tenancy/tenant-scoped.repository";
import { stockMovements } from "./tables/stock-movements.table";

/** The movement log is only ever appended to (G4). */
@Injectable()
export class StockMovementsRepository extends TenantScopedRepository<typeof stockMovements> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, stockMovements);
  }

  async append(
    tenantId: string,
    rows: TenantInsert<typeof stockMovements>[],
    within: TenantTx,
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.run(
      tenantId,
      async (tx) => {
        await tx.insert(stockMovements).values(rows.map((r) => ({ ...r, tenantId })));
      },
      within,
    );
  }
}
