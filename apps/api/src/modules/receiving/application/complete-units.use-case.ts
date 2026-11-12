import { Injectable } from "@nestjs/common";
import type { DeliveryResponse, completeUnitsRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { ProductDirectory } from "../../catalog/application/product-directory";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { StockService } from "../../inventory/application/stock.service";
import { inScope, locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";
import { hashCommand } from "../domain/request-hash";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { DeliveryLinesRepository } from "../infrastructure/delivery-lines.repository";
import { assertPermission, isOwnerOrManager } from "./access";
import { CommandGuard, type CommandKey } from "./command-guard";
import { DeliveryView } from "./delivery-view";
import { UnitChecks } from "./unit-checks";

export type CompleteUnitsInput = z.output<typeof completeUnitsRequestSchema>;

/**
 * `POST /deliveries/:id/units` (receive_stock): adds the missing IMEIs/serials of lines saved
 * as incomplete. The same number rules as receiving apply; a line cannot get more units than
 * pieces still missing (400 `imei_count_mismatch`). Quantity lines take none
 * (400 `units_not_allowed`); a line of another delivery is 404 `line_not_found`.
 */
@Injectable()
export class CompleteUnitsUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly deliveries: DeliveriesRepository,
    private readonly lines: DeliveryLinesRepository,
    private readonly products: ProductDirectory,
    private readonly stock: StockService,
    private readonly unitChecks: UnitChecks,
    private readonly guard: CommandGuard,
    private readonly view: DeliveryView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, body: CompleteUnitsInput): Promise<DeliveryResponse> {
    const { access } = actor;
    const { tenantId, userId } = access;
    assertPermission(access, "receive_stock");
    const key: CommandKey = {
      commandId: body.commandId,
      operation: "units",
      hash: hashCommand("units", id, body),
      userId,
    };
    const confirmed = body.confirmSoldBefore && isOwnerOrManager(access);
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const earlier = await this.guard.begin(t, key);
      const row = await this.deliveries.findById(tenantId, earlier ?? id, t);
      if (!row || !inScope(locationScopeOf(access), row.locationId)) {
        throw DeliveryErrors.notFound();
      }
      if (earlier) return { row, replayed: true, added: 0 };

      const own = new Map(
        (await this.lines.forDeliveries(tenantId, [row.id], t)).map((l) => [l.id, l]),
      );
      const lineIds = [...new Set(body.units.map((u) => u.lineId))];
      for (const lineId of lineIds) if (!own.has(lineId)) throw DeliveryErrors.lineNotFound(lineId);

      // Lock the layers: two people completing the same line cannot both fill the last slot.
      const layers = await this.stock.lockLayers(
        t,
        lineIds.map((lineId) => own.get(lineId)!.layerId),
      );
      const productIds = [...new Set(lineIds.map((lineId) => own.get(lineId)!.productId))];
      const products = new Map(
        (await this.products.byIds(tenantId, productIds, t)).map((p) => [p.id, p]),
      );
      const existing = await this.stock.unitsOfLayers(
        tenantId,
        layers.map((l) => l.id),
        t,
      );

      const groups = lineIds.map((lineId) => ({
        lineId,
        product: products.get(own.get(lineId)!.productId)!,
        inputs: body.units
          .filter((u) => u.lineId === lineId)
          .map(({ imei, imei2, serial }) => ({ imei, imei2, serial })),
      }));
      const prepared = await this.unitChecks.prepare(
        t,
        groups.map((g) => ({
          productId: g.product.id,
          trackingType: g.product.trackingType,
          inputs: g.inputs,
        })),
        confirmed,
      );
      let added = 0;
      for (const [i, g] of groups.entries()) {
        const line = own.get(g.lineId)!;
        const layer = layers.find((l) => l.id === line.layerId)!;
        const have = existing.filter((u) => u.layerId === layer.id).length;
        const missing = line.pieces - have;
        if (prepared[i]!.length > missing) {
          throw DeliveryErrors.imeiCountMismatch({
            productId: g.product.id,
            pieces: missing,
            units: prepared[i]!.length,
          });
        }
        await this.stock.addUnits(t, layer, prepared[i]!, have, userId);
        added += prepared[i]!.length;
      }
      await this.guard.record(t, key, row.id);
      return { row, replayed: false, added };
    });

    if (!result.replayed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "delivery_units_completed",
        targetId: result.row.id,
        details: {
          number: result.row.number,
          unitsAdded: result.added,
          soldBeforeConfirmed: confirmed,
        },
      });
    }
    return { delivery: (await this.view.many(access, [result.row]))[0]! };
  }
}
