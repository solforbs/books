import { Injectable } from "@nestjs/common";
import type { PaymentRule } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { StockService } from "../../inventory/application/stock.service";
import type { UnitNumbers } from "../../inventory/domain/unit-numbers";
import { LedgerService } from "../../ledger/application/ledger.service";
import type { LedgerLineInput } from "../../ledger/domain/ledger-entry";
import { ruleToColumns } from "../../suppliers/domain/payment-rule";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { DeliveryLinesRepository } from "../infrastructure/delivery-lines.repository";
import { DeliveryPaymentsRepository } from "../infrastructure/delivery-payments.repository";
import type { DeliveryRow } from "../infrastructure/tables/deliveries.table";
import type { CommandKey } from "./command-guard";
import type { ResolvedLine } from "./delivery-intake";
import type { PlannedPayment } from "./payment-planner";

export interface NewDelivery {
  userId: string;
  supplierId: string;
  locationId: string;
  invoiceNumber: string | null;
  note: string | null;
  rule: PaymentRule;
  dueDate: string | null;
  lines: ResolvedLine[];
  /** Cleaned unit numbers of each line, in line order. */
  units: UnitNumbers[][];
  payments: PlannedPayment[];
  key: CommandKey;
}

/**
 * Saves a validated delivery inside the caller transaction (ARCH-02 section 3): the document,
 * a stock layer (with units and movements) per line, the payments, and ONE ledger entry:
 * stock value up by the known total, money places down by what was paid, and the rest owed to
 * the supplier. A line without a total posts nothing until its cost is entered.
 */
@Injectable()
export class DeliveryWriter {
  constructor(
    private readonly deliveries: DeliveriesRepository,
    private readonly lines: DeliveryLinesRepository,
    private readonly payments: DeliveryPaymentsRepository,
    private readonly stock: StockService,
    private readonly ledger: LedgerService,
  ) {}

  async write(t: TenantTx, d: NewDelivery): Promise<DeliveryRow> {
    const { tenantId } = t;
    const delivery = await this.deliveries.create(
      tenantId,
      {
        number: await this.deliveries.nextNumber(tenantId, t),
        supplierId: d.supplierId,
        locationId: d.locationId,
        invoiceNumber: d.invoiceNumber,
        note: d.note,
        ...ruleToColumns(d.rule),
        dueDate: d.dueDate,
        createdByUserId: d.userId,
      },
      t,
    );

    let knownTotal = 0;
    for (const [index, line] of d.lines.entries()) {
      const total = line.input.lineTotalCents ?? null;
      knownTotal += total ?? 0;
      const { layer } = await this.stock.receiveLine(t, {
        productId: line.product.id,
        locationId: d.locationId,
        supplierId: d.supplierId,
        trackingType: line.product.trackingType,
        pieces: line.pieces,
        costTotalCents: total,
        sourceType: "delivery",
        sourceId: delivery.id,
        userId: d.userId,
        units: d.units[index]!,
      });
      await this.lines.create(
        tenantId,
        {
          deliveryId: delivery.id,
          lineNo: index + 1,
          productId: line.product.id,
          packUnitId: line.pack?.id ?? null,
          quantity: line.input.quantity,
          pieces: line.pieces,
          layerId: layer.id,
        },
        t,
      );
    }

    for (const p of d.payments) {
      await this.payments.create(tenantId, { deliveryId: delivery.id, ...p }, t);
    }
    const paid = d.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const entry: LedgerLineInput[] = [
      { account: "inventory", amountCents: knownTotal },
      ...d.payments.map((p) => ({
        account: "money_place" as const,
        moneyPlaceId: p.moneyPlaceId,
        amountCents: -p.amountCents,
      })),
      { account: "supplier_payable", supplierId: d.supplierId, amountCents: -(knownTotal - paid) },
    ];
    await this.ledger.post(t, {
      type: "delivery",
      createdByUserId: d.userId,
      locationId: d.locationId,
      sourceType: "delivery",
      sourceId: delivery.id,
      // Namespaced, so the ledger key can never clash with another module command ids.
      commandId: `receiving:create:${d.key.commandId}`,
      lines: entry,
    });
    return delivery;
  }
}
