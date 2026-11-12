import { Injectable } from "@nestjs/common";
import type { SupplierResponse, updateSupplierRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { diffSupplier, hasChanges } from "../domain/supplier-changes";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission } from "./access";
import { SupplierChecks } from "./supplier-checks";
import { SupplierConflicts } from "./supplier-conflicts";
import { SupplierLock } from "./supplier-lock";
import { SupplierView } from "./supplier-view";

export type UpdateSupplierInput = z.output<typeof updateSupplierRequestSchema>;

/**
 * `PATCH /suppliers/:id` (manage_suppliers), any status. Only fields that are sent change; a
 * new payment rule replaces the whole rule and affects only deliveries made afterwards (none
 * exist yet). A changed phone is checked for duplicates, a changed name for similar names;
 * the status never changes here. A request that changes nothing writes nothing.
 */
@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: SupplierLock,
    private readonly suppliers: SuppliersRepository,
    private readonly checks: SupplierChecks,
    private readonly conflicts: SupplierConflicts,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: UpdateSupplierInput): Promise<SupplierResponse> {
    const { tenantId } = actor.access;
    assertPermission(actor.access, "manage_suppliers");
    const { acknowledgeSimilar, ...fields } = input;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.any(t, id);
        const change = diffSupplier(row, fields);
        if (!hasChanges(change))
          return { change, supplier: await this.view.one(row, actor.access, t) };
        if (change.set.phone) await this.checks.assertPhoneFree(t, change.set.phone, id);
        if (change.set.name) {
          await this.checks.assertNoSimilar(
            t,
            actor.access,
            change.set.name,
            id,
            acknowledgeSimilar ?? false,
          );
        }
        await this.suppliers.updateById(tenantId, id, change.set, t);
        const updated = (await this.suppliers.findById(tenantId, id, t))!;
        return { change, supplier: await this.view.one(updated, actor.access, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, tenantId, fields.phone ?? null)) ?? err;
    }
    if (hasChanges(result.change)) {
      await this.audit.record({
        ...auditBase(actor),
        action: "supplier_updated",
        targetId: id,
        details: { before: result.change.before, after: result.change.after },
      });
    }
    return { supplier: result.supplier };
  }
}
