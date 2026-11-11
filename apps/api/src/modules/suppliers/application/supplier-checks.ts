import { Injectable } from "@nestjs/common";
import { areNamesSimilar, type Supplier } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { SupplierView } from "./supplier-view";

/** The two duplicate checks every write runs, in this order: the phone, then similar names. */
@Injectable()
export class SupplierChecks {
  constructor(
    private readonly suppliers: SuppliersRepository,
    private readonly view: SupplierView,
  ) {}

  /** 409 `supplier_phone_exists` when another supplier (any status) has this phone. */
  async assertPhoneFree(t: TenantTx, phone: string, exceptId: string | null): Promise<void> {
    const other = await this.suppliers.findByPhone(t.tenantId, phone, exceptId, t);
    if (other) throw SupplierErrors.phoneExists(other.id, other.name);
  }

  /**
   * 409 `similar_suppliers` when a supplier (any status) has a similar name, unless the person
   * already said they are different. Returns the similar ones (for the audit when acknowledged).
   */
  async assertNoSimilar(
    t: TenantTx,
    name: string,
    exceptId: string | null,
    acknowledged: boolean,
  ): Promise<Supplier[]> {
    const pool = await this.suppliers.namePool(t.tenantId, t);
    const ids = pool
      .filter((s) => s.id !== exceptId && areNamesSimilar(name, s.name))
      .map((s) => s.id);
    const similar = await this.view.many(await this.suppliers.findManyByIds(t.tenantId, ids, t), t);
    if (similar.length > 0 && !acknowledged) throw SupplierErrors.similar(similar);
    return similar;
  }
}
