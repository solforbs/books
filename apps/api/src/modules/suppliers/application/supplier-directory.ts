import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";

/** Public read interface of the suppliers module for other modules (receiving). */
@Injectable()
export class SupplierDirectory {
  constructor(private readonly suppliers: SuppliersRepository) {}

  findById(tenantId: string, id: string, within?: TenantTx): Promise<SupplierRow | null> {
    return this.suppliers.findById(tenantId, id, within);
  }

  async namesByIds(
    tenantId: string,
    ids: string[],
    within?: TenantTx,
  ): Promise<Map<string, string>> {
    const rows = await this.suppliers.findManyByIds(tenantId, ids, within);
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
