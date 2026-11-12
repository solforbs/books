import { Injectable } from "@nestjs/common";
import type { SupplierResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission, hasPermission } from "./access";
import { SupplierBalanceProbe } from "./supplier-balance-probe";
import { SupplierLock } from "./supplier-lock";
import { SupplierView } from "./supplier-view";

/**
 * `POST /suppliers/:id/hide` (manage_suppliers). Nothing is deleted (G4); a supplier is hidden
 * only when the shop owes it nothing (409 `supplier_has_balance`). Hiding a hidden supplier
 * changes nothing. A waiting supplier cannot be hidden (409 `supplier_not_active`): an approver
 * completes it first, so nobody can take it out of the approvers' queue.
 */
@Injectable()
export class HideSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: SupplierLock,
    private readonly suppliers: SuppliersRepository,
    private readonly probe: SupplierBalanceProbe,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<SupplierResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "manage_suppliers");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.any(t, id);
      if (row.status === "hidden")
        return {
          changed: false,
          before: row.status,
          supplier: await this.view.one(row, actor.access, t),
        };
      if (row.status === "waiting") throw SupplierErrors.notActive();
      const balance = await this.probe.balanceOf(tenantId, id);
      if (balance !== 0)
        throw SupplierErrors.hasBalance(balance, hasPermission(actor.access, "see_cost_profit"));
      await this.suppliers.updateById(tenantId, id, { status: "hidden", hiddenFrom: "active" }, t);
      const hidden = (await this.suppliers.findById(tenantId, id, t))!;
      return {
        changed: true,
        before: row.status,
        supplier: await this.view.one(hidden, actor.access, t),
      };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "supplier_hidden",
        targetId: id,
        details: { before: { status: result.before }, after: { status: "hidden" } },
      });
    }
    return { supplier: result.supplier };
  }
}
