import { Injectable } from "@nestjs/common";
import type { Supplier } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { MembersService } from "../../identity/application/members.service";
import { ruleOf } from "../domain/payment-rule";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";

/** Builds the `Supplier` of the contract: the row plus the name of who added it. */
@Injectable()
export class SupplierView {
  constructor(private readonly members: MembersService) {}

  async many(rows: SupplierRow[], within?: TenantTx): Promise<Supplier[]> {
    if (rows.length === 0) return [];
    const names = await this.members.namesOf(
      rows.map((r) => r.addedByUserId),
      within,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      paymentRule: ruleOf(r),
      currency: r.currency,
      isNeighbour: r.isNeighbour,
      kraPin: r.kraPin,
      marketOrLocation: r.marketOrLocation,
      notes: r.notes,
      status: r.status,
      addedBy: { id: r.addedByUserId, name: names.get(r.addedByUserId) ?? "" },
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async one(row: SupplierRow, within?: TenantTx): Promise<Supplier> {
    return (await this.many([row], within))[0]!;
  }
}
