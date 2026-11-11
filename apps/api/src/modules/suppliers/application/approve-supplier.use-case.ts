import { Injectable } from "@nestjs/common";
import type { SupplierResponse, approveSupplierRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { diffSupplier } from "../domain/supplier-changes";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission } from "./access";
import { SupplierChecks } from "./supplier-checks";
import { SupplierConflicts } from "./supplier-conflicts";
import { SupplierLock } from "./supplier-lock";
import { SupplierView } from "./supplier-view";

/** The request body with `phone` optional: a missing phone is answered with `phone_required`. */
export type ApproveSupplierInput = Partial<z.output<typeof approveSupplierRequestSchema>>;

/**
 * `POST /suppliers/:id/approve` (approve_items). Completes a waiting supplier: it must have a
 * phone once the request is applied (sent now, or already on the record), otherwise 400
 * `phone_required`. Optional fixes follow the same rules as an update (duplicate phone, similar
 * name). Any other status gives 409 `not_waiting`.
 */
@Injectable()
export class ApproveSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly lock: SupplierLock,
    private readonly suppliers: SuppliersRepository,
    private readonly checks: SupplierChecks,
    private readonly conflicts: SupplierConflicts,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: ApproveSupplierInput): Promise<SupplierResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "approve_items");
    const { acknowledgeSimilar, ...fields } = input;
    let result;
    try {
      result = await this.tenantDb.transaction(tenantId, async (t) => {
        const row = await this.lock.any(t, id);
        if (row.status !== "waiting") throw SupplierErrors.notWaiting();
        if (!fields.phone && !row.phone) throw SupplierErrors.phoneRequired();
        const change = diffSupplier(row, fields);
        if (change.set.phone) await this.checks.assertPhoneFree(t, change.set.phone, id);
        if (change.set.name) {
          await this.checks.assertNoSimilar(t, change.set.name, id, acknowledgeSimilar ?? false);
        }
        await this.suppliers.updateById(
          tenantId,
          id,
          { ...change.set, status: "active", decidedByUserId: userId },
          t,
        );
        const approved = (await this.suppliers.findById(tenantId, id, t))!;
        return { change, supplier: await this.view.one(approved, t) };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, tenantId, fields.phone ?? null)) ?? err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "supplier_approved",
      targetId: id,
      details: {
        before: { status: "waiting", ...result.change.before },
        after: { status: "active", ...result.change.after },
      },
    });
    return { supplier: result.supplier };
  }
}
