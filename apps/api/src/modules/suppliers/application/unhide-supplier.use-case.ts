import { Injectable } from "@nestjs/common";
import type { SupplierResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission } from "./access";
import { SupplierLock } from "./supplier-lock";
import { SupplierView } from "./supplier-view";

/**
 * `POST /suppliers/:id/unhide` (manage_suppliers). The supplier returns to the status it had
 * when it was hidden (waiting or active). Showing a supplier that is not hidden changes nothing.
 */
@Injectable()
export class UnhideSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: SupplierLock,
    private readonly suppliers: SuppliersRepository,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<SupplierResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "manage_suppliers");
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.lock.any(t, id);
      if (row.status !== "hidden") return { changed: false, supplier: await this.view.one(row, t) };
      const back = row.hiddenFrom ?? "active";
      await this.suppliers.updateById(tenantId, id, { status: back, hiddenFrom: null }, t);
      const shown = (await this.suppliers.findById(tenantId, id, t))!;
      return { changed: true, back, supplier: await this.view.one(shown, t) };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "supplier_unhidden",
        targetId: id,
        details: { before: { status: "hidden" }, after: { status: result.back } },
      });
    }
    return { supplier: result.supplier };
  }
}
