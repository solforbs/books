import { Injectable } from "@nestjs/common";
import type { DeliveryResponse, createDeliveryRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";
import { dueDateFor } from "../domain/due-date";
import { hashCommand } from "../domain/request-hash";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { assertPermission, canSeeCosts, isOwnerOrManager } from "./access";
import { CommandGuard, type CommandKey } from "./command-guard";
import { DeliveryIntake } from "./delivery-intake";
import { DeliveryView } from "./delivery-view";
import { DeliveryWriter } from "./delivery-writer";
import { PaymentPlanner } from "./payment-planner";
import { UnitChecks } from "./unit-checks";

export type CreateDeliveryInput = z.output<typeof createDeliveryRequestSchema>;

/**
 * `POST /deliveries` (receive_stock): saves a whole delivery in one transaction (F04a).
 * Totals and payments need see_cost_profit, payments also pay_suppliers (403 `forbidden`).
 * The same `commandId` with the same body returns the first delivery (`replayed`), with a
 * different body 409 `command_conflict`.
 */
@Injectable()
export class CreateDeliveryUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly locations: LocationsService,
    private readonly intake: DeliveryIntake,
    private readonly unitChecks: UnitChecks,
    private readonly planner: PaymentPlanner,
    private readonly guard: CommandGuard,
    private readonly writer: DeliveryWriter,
    private readonly deliveries: DeliveriesRepository,
    private readonly view: DeliveryView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    actor: Actor,
    body: CreateDeliveryInput,
  ): Promise<{ response: DeliveryResponse; replayed: boolean }> {
    const { access } = actor;
    const { tenantId, userId } = access;
    assertPermission(access, "receive_stock");
    const hasTotals = body.lines.some((l) => l.lineTotalCents !== undefined);
    if ((hasTotals || body.payments.length > 0) && !canSeeCosts(access)) {
      throw DeliveryErrors.forbidden();
    }
    if (body.payments.length > 0) assertPermission(access, "pay_suppliers");

    const key: CommandKey = {
      commandId: body.commandId,
      operation: "create",
      hash: hashCommand("create", null, body),
      userId,
    };
    const confirmed = body.confirmSoldBefore && isOwnerOrManager(access);
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const earlier = await this.guard.begin(t, key);
      if (earlier) {
        const row = await this.deliveries.findById(tenantId, earlier, t);
        return { row: row!, replayed: true, pieces: 0, known: 0, paid: 0, incomplete: 0 };
      }
      const scope = locationScopeOf(access);
      await this.locations.assertUsable(tenantId, [body.locationId], scope, t);
      const { supplier, rule } = await this.intake.supplier(t, body.supplierId, body.paymentRule);
      const lines = await this.intake.lines(t, body.lines);
      const units = await this.unitChecks.prepare(
        t,
        lines.map((l) => ({
          productId: l.product.id,
          trackingType: l.product.trackingType,
          inputs: l.input.units ?? [],
        })),
        confirmed,
      );
      let incomplete = 0;
      for (const [i, line] of lines.entries()) {
        if (line.product.trackingType === "quantity") continue;
        const count = units[i]!.length;
        const short = count < line.pieces;
        if (count > line.pieces || (short && !body.allowIncomplete)) {
          throw DeliveryErrors.imeiCountMismatch({
            productId: line.product.id,
            pieces: line.pieces,
            units: count,
          });
        }
        incomplete += line.pieces - count;
      }
      const known = lines.reduce((sum, l) => sum + (l.input.lineTotalCents ?? 0), 0);
      const payments = await this.planner.plan(
        t,
        body.payments,
        known,
        scope,
        isOwnerOrManager(access),
      );
      const row = await this.writer.write(t, {
        userId,
        supplierId: supplier.id,
        locationId: body.locationId,
        invoiceNumber: body.invoiceNumber ?? null,
        note: body.note ?? null,
        rule,
        dueDate: dueDateFor(rule, new Date()),
        lines,
        units,
        payments,
        key,
      });
      await this.guard.record(t, key, row.id);
      return {
        row,
        replayed: false,
        pieces: lines.reduce((sum, l) => sum + l.pieces, 0),
        known,
        paid: payments.reduce((sum, p) => sum + p.amountCents, 0),
        incomplete,
      };
    });

    if (!result.replayed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "delivery_received",
        targetId: result.row.id,
        details: {
          number: result.row.number,
          supplierId: result.row.supplierId,
          locationId: result.row.locationId,
          lines: body.lines.length,
          pieces: result.pieces,
          knownTotalCents: result.known,
          paidCents: result.paid,
          pendingCostLines: body.lines.filter((l) => l.lineTotalCents === undefined).length,
          incompleteUnits: result.incomplete,
          soldBeforeConfirmed: confirmed,
        },
      });
    }
    const [delivery] = await this.view.many(access, [result.row]);
    return { response: { delivery: delivery! }, replayed: result.replayed };
  }
}
