import { Injectable } from "@nestjs/common";
import type { SupplierResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission } from "./access";
import { SupplierBalanceProbe } from "./supplier-balance-probe";
import { SupplierLock } from "./supplier-lock";
import { SupplierView } from "./supplier-view";

/**
 * `POST /suppliers/:id/hide` (manage_suppliers). Nothing is deleted (G4); a supplier is hidden
 * only when the shop owes it nothing (409 `supplier_has_balance`). Hiding a hidden supplier
 * changes nothing. A waiting supplier stays waiting underneath and returns to waiting.
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
      if (row.status === "hidden") return { changed: false, supplier: await this.view.one(row, t) };
      const balance = await this.probe.balanceOf(tenantId, id);
      if (balance !== 0) throw SupplierErrors.hasBalance(balance);
      const hiddenFrom = row.status === "waiting" ? "waiting" : "active";
      await this.suppliers.updateById(tenantId, id, { status: "hidden", hiddenFrom }, t);
      const hidden = (await this.suppliers.findById(tenantId, id, t))!;
      return { changed: true, supplier: await this.view.one(hidden, t) };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "supplier_hidden",
        targetId: id,
        details: { before: { status: "visible" }, after: { status: "hidden" } },
      });
    }
    return { supplier: result.supplier };
  }
}
