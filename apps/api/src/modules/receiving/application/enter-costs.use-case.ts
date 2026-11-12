import { Injectable } from "@nestjs/common";
import type { DeliveryResponse, enterCostsRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { StockService } from "../../inventory/application/stock.service";
import { LedgerService } from "../../ledger/application/ledger.service";
import { inScope, locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";
import { hashCommand } from "../domain/request-hash";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { DeliveryLinesRepository } from "../infrastructure/delivery-lines.repository";
import { canEnterCosts } from "./access";
import { CommandGuard, type CommandKey } from "./command-guard";
import { DeliveryView } from "./delivery-view";

export type EnterCostsInput = z.output<typeof enterCostsRequestSchema>;

/**
 * `POST /deliveries/:id/costs` (see_cost_profit, and the owner or a person who receives
 * stock): gives a cost to lines that were received price-pending. Each cost can be set once
 * (409 `cost_already_known`, 404 `line_not_found` for a line of another delivery). One ledger
 * entry then raises the stock value and what is owed to the supplier by the sum of the costs.
 */
@Injectable()
export class EnterCostsUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly deliveries: DeliveriesRepository,
    private readonly lines: DeliveryLinesRepository,
    private readonly stock: StockService,
    private readonly ledger: LedgerService,
    private readonly guard: CommandGuard,
    private readonly view: DeliveryView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, body: EnterCostsInput): Promise<DeliveryResponse> {
    const { access } = actor;
    const { tenantId, userId } = access;
    if (!canEnterCosts(access)) throw DeliveryErrors.forbidden();
    const key: CommandKey = {
      commandId: body.commandId,
      operation: "costs",
      hash: hashCommand("costs", id, body),
      userId,
    };
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const earlier = await this.guard.begin(t, key);
      const row = await this.deliveries.findById(tenantId, earlier ?? id, t);
      if (!row || !inScope(locationScopeOf(access), row.locationId)) {
        throw DeliveryErrors.notFound();
      }
      if (earlier) return { row, replayed: true, total: 0 };

      const ids = body.lines.map((l) => l.lineId);
      if (new Set(ids).size !== ids.length) throw DeliveryErrors.duplicateLine();
      const own = new Map(
        (await this.lines.forDeliveries(tenantId, [row.id], t)).map((l) => [l.id, l]),
      );
      for (const lineId of ids) if (!own.has(lineId)) throw DeliveryErrors.lineNotFound(lineId);

      const layers = await this.stock.lockLayers(
        t,
        ids.map((lineId) => own.get(lineId)!.layerId),
      );
      let total = 0;
      for (const entered of body.lines) {
        const layer = layers.find((l) => l.id === own.get(entered.lineId)!.layerId)!;
        if (layer.costTotalCents !== null) throw DeliveryErrors.costAlreadyKnown(entered.lineId);
        await this.stock.setLayerCost(t, layer, entered.lineTotalCents);
        total += entered.lineTotalCents;
      }
      await this.ledger.post(t, {
        type: "cost_entered",
        createdByUserId: userId,
        locationId: row.locationId,
        sourceType: "delivery",
        sourceId: row.id,
        commandId: key.commandId,
        lines: [
          { account: "inventory", amountCents: total },
          { account: "supplier_payable", supplierId: row.supplierId, amountCents: -total },
        ],
      });
      await this.guard.record(t, key, row.id);
      return { row, replayed: false, total };
    });

    if (!result.replayed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "delivery_costs_entered",
        targetId: result.row.id,
        details: { number: result.row.number, lines: body.lines.length, totalCents: result.total },
      });
    }
    return { delivery: (await this.view.many(access, [result.row]))[0]! };
  }
}
