import { Injectable } from "@nestjs/common";
import {
  normalizeForCompare,
  type SupplierResponse,
  type createSupplierRequestSchema,
} from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { ruleToColumns } from "../domain/payment-rule";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertPermission } from "./access";
import { SupplierChecks } from "./supplier-checks";
import { SupplierConflicts } from "./supplier-conflicts";
import { SupplierView } from "./supplier-view";

export type CreateSupplierInput = z.output<typeof createSupplierRequestSchema>;

/**
 * `POST /suppliers` (manage_suppliers): the full form. The supplier is `active` at once.
 * Refused, in this order: same phone (409 `supplier_phone_exists`), similar names (409
 * `similar_suppliers`, unless `acknowledgeSimilar`).
 */
@Injectable()
export class CreateSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly suppliers: SuppliersRepository,
    private readonly checks: SupplierChecks,
    private readonly conflicts: SupplierConflicts,
    private readonly view: SupplierView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: CreateSupplierInput): Promise<SupplierResponse> {
    const { tenantId, userId } = actor.access;
    assertPermission(actor.access, "manage_suppliers");
    let created;
    try {
      created = await this.tenantDb.transaction(tenantId, async (t) => {
        await this.checks.assertPhoneFree(t, input.phone, null);
        const similar = await this.checks.assertNoSimilar(
          t,
          input.name,
          null,
          input.acknowledgeSimilar,
        );
        const row = await this.suppliers.create(
          tenantId,
          {
            name: input.name,
            nameKey: normalizeForCompare(input.name),
            phone: input.phone,
            ...ruleToColumns(input.paymentRule),
            currency: input.currency,
            isNeighbour: input.isNeighbour,
            kraPin: input.kraPin ?? null,
            marketOrLocation: input.marketOrLocation ?? null,
            notes: input.notes ?? null,
            status: "active",
            addedByUserId: userId,
          },
          t,
        );
        return { supplier: await this.view.one(row, t), similar };
      });
    } catch (err) {
      throw (await this.conflicts.translate(err, tenantId, input.phone)) ?? err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "supplier_created",
      targetId: created.supplier.id,
      details: {
        after: {
          name: created.supplier.name,
          phone: created.supplier.phone,
          paymentRule: created.supplier.paymentRule,
          currency: created.supplier.currency,
          isNeighbour: created.supplier.isNeighbour,
          status: created.supplier.status,
        },
        acknowledgedSimilar: created.similar.map((s) => s.id),
      },
    });
    return { supplier: created.supplier };
  }
}
