import { Injectable } from "@nestjs/common";
import {
  normalizeForCompare,
  type SupplierResponse,
  type quickSupplierRequestSchema,
} from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission, hasPermission } from "./access";
import { SupplierChecks } from "./supplier-checks";
import { SupplierView } from "./supplier-view";

export type QuickSupplierInput = z.output<typeof quickSupplierRequestSchema>;

/**
 * `POST /suppliers/quick` (receive_stock): name only, saved as `waiting` for an approver to
 * complete (F03 section 9.10). People who can manage suppliers are refused with 400
 * `use_full_form`, so a shop run by owners and managers never gets a waiting supplier (G1).
 * The similar-name check runs here too.
 */
@Injectable()
export class QuickAddSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly suppliers: SuppliersRepository,
    private readonly checks: SupplierChecks,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: QuickSupplierInput): Promise<SupplierResponse> {
    const { tenantId, userId } = actor.access;
    if (hasPermission(actor.access, "manage_suppliers")) throw SupplierErrors.useFullForm();
    assertPermission(actor.access, "receive_stock");
    const created = await this.tenantDb.transaction(tenantId, async (t) => {
      const similar = await this.checks.assertNoSimilar(
        t,
        actor.access,
        input.name,
        null,
        input.acknowledgeSimilar,
      );
      const row = await this.suppliers.create(
        tenantId,
        {
          name: input.name,
          nameKey: normalizeForCompare(input.name),
          status: "waiting",
          addedByUserId: userId,
        },
        t,
      );
      return { supplier: await this.view.one(row, actor.access, t), similar };
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "supplier_quick_added",
      targetId: created.supplier.id,
      details: {
        after: { name: created.supplier.name, status: "waiting" },
        acknowledgedSimilar: created.similar.map((s) => s.id),
      },
    });
    return { supplier: created.supplier };
  }
}
