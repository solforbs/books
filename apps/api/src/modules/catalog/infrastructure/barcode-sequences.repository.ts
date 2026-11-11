import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { barcodeSequences } from "./tables/barcode-sequences.table";

@Injectable()
export class BarcodeSequencesRepository extends TenantScopedRepository<typeof barcodeSequences> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, barcodeSequences);
  }

  /**
   * The next number for this business. One upsert both creates the counter and advances it;
   * the row lock it takes makes concurrent callers wait their turn, so no number is handed
   * out twice. The increment belongs to the caller's transaction: a rollback gives it back.
   */
  async next(tenantId: string, within: TenantTx): Promise<number> {
    const result = await within.tx.execute(sql`
      insert into barcode_sequences (tenant_id, last_value) values (${tenantId}, 1)
      on conflict (tenant_id) do update
        set last_value = barcode_sequences.last_value + 1, updated_at = now()
      returning last_value`);
    return Number((result.rows[0] as { last_value: string | number }).last_value);
  }
}
