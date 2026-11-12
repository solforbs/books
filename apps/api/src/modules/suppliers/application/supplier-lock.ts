import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";

/** Locks the supplier a write is about, so concurrent changes to it happen one after another. */
@Injectable()
export class SupplierLock {
  constructor(private readonly suppliers: SuppliersRepository) {}

  /** Any supplier of this business, whatever its status; 404 `supplier_not_found` otherwise. */
  async any(t: TenantTx, id: string): Promise<SupplierRow> {
    const row = await this.suppliers.lockById(t.tenantId, id, t);
    if (!row) throw SupplierErrors.notFound();
    return row;
  }
}
