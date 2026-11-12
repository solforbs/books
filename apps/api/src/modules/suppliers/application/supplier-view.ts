import { Injectable } from "@nestjs/common";
import type { Supplier } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { MembersService } from "../../identity/application/members.service";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { ruleOf } from "../domain/payment-rule";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";
import { hasPermission } from "./access";

/**
 * Builds the `Supplier` of the contract: the row plus the name of who added it. This is the ONE
 * place that decides what a reader sees: people who can read suppliers only through
 * `receive_stock` (no manage_suppliers, no approve_items) get id, name, phone, payment rule,
 * status, who added it and when; currency, neighbour flag, KRA PIN, market and notes are left
 * out. Every response (including conflict details) goes through here, so no endpoint can forget.
 */
@Injectable()
export class SupplierView {
  constructor(private readonly members: MembersService) {}

  async many(
    rows: SupplierRow[],
    access: TenantAccessContext,
    within?: TenantTx,
  ): Promise<Supplier[]> {
    if (rows.length === 0) return [];
    const names = await this.members.namesOf(
      rows.map((r) => r.addedByUserId),
      within,
    );
    const full =
      hasPermission(access, "manage_suppliers") || hasPermission(access, "approve_items");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      paymentRule: ruleOf(r),
      ...(full
        ? {
            currency: r.currency,
            isNeighbour: r.isNeighbour,
            kraPin: r.kraPin,
            marketOrLocation: r.marketOrLocation,
            notes: r.notes,
          }
        : {}),
      status: r.status,
      addedBy: { id: r.addedByUserId, name: names.get(r.addedByUserId) ?? "" },
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async one(row: SupplierRow, access: TenantAccessContext, within?: TenantTx): Promise<Supplier> {
    return (await this.many([row], access, within))[0]!;
  }
}
