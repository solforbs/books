import { Injectable } from "@nestjs/common";
import type { Delivery } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { ProductDirectory } from "../../catalog/application/product-directory";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { MembersService } from "../../identity/application/members.service";
import { StockService } from "../../inventory/application/stock.service";
import { LocationsService } from "../../locations/application/locations.service";
import { SupplierDirectory } from "../../suppliers/application/supplier-directory";
import { ruleOf } from "../../suppliers/domain/payment-rule";
import { DeliveryLinesRepository } from "../infrastructure/delivery-lines.repository";
import { DeliveryPaymentsRepository } from "../infrastructure/delivery-payments.repository";
import type { DeliveryRow } from "../infrastructure/tables/deliveries.table";
import { canSeeCosts } from "./access";

/**
 * Turns delivery rows into the contract shape, many at a time (one query per kind of data).
 * Money fields are null for people without see_cost_profit. Totals are calculated from the
 * stock layers and the payments, never stored on the delivery.
 */
@Injectable()
export class DeliveryView {
  constructor(
    private readonly lines: DeliveryLinesRepository,
    private readonly payments: DeliveryPaymentsRepository,
    private readonly stock: StockService,
    private readonly products: ProductDirectory,
    private readonly suppliers: SupplierDirectory,
    private readonly locations: LocationsService,
    private readonly members: MembersService,
  ) {}

  async many(access: TenantAccessContext, rows: DeliveryRow[], t?: TenantTx): Promise<Delivery[]> {
    if (rows.length === 0) return [];
    const { tenantId } = access;
    const showMoney = canSeeCosts(access);
    const deliveryIds = rows.map((r) => r.id);
    const lines = await this.lines.forDeliveries(tenantId, deliveryIds, t);
    const payments = await this.payments.forDeliveries(tenantId, deliveryIds, t);
    const layers = new Map(
      (
        await this.stock.layersByIds(
          tenantId,
          lines.map((l) => l.layerId),
          t,
        )
      ).map((l) => [l.id, l]),
    );
    const units = await this.stock.unitsOfLayers(
      tenantId,
      lines.map((l) => l.layerId),
      t,
    );
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = new Map(
      (await this.products.byIds(tenantId, productIds, t)).map((p) => [p.id, p]),
    );
    const packs = new Map(
      (await this.products.packsOf(tenantId, productIds, t)).map((p) => [p.id, p]),
    );
    const supplierNames = await this.suppliers.namesByIds(
      tenantId,
      rows.map((r) => r.supplierId),
      t,
    );
    const locationNames = await this.locations.namesOf(
      tenantId,
      rows.map((r) => r.locationId),
      t,
    );
    const placeNames = await this.locations.placeNamesOf(
      tenantId,
      payments.map((p) => p.moneyPlaceId),
      t,
    );
    const userNames = await this.members.namesOf(
      rows.map((r) => r.createdByUserId),
      t,
    );

    return rows.map((row) => {
      const own = lines.filter((l) => l.deliveryId === row.id);
      const outLines = own.map((line) => {
        const layer = layers.get(line.layerId)!;
        const product = products.get(line.productId)!;
        const pack = line.packUnitId ? packs.get(line.packUnitId) : undefined;
        const lineUnits = units.filter((u) => u.layerId === layer.id);
        const known = layer.costTotalCents !== null;
        return {
          id: line.id,
          product: { id: product.id, name: product.name, trackingType: product.trackingType },
          packUnit: pack ? { id: pack.id, name: pack.name, size: pack.size } : null,
          quantity: line.quantity,
          pieces: line.pieces,
          lineTotalCents: showMoney && known ? layer.costTotalCents : null,
          costState: known ? ("known" as const) : ("pending" as const),
          units: lineUnits.map((u) => ({
            id: u.id,
            imei: u.imei,
            imei2: u.imei2,
            serial: u.serial,
            status: u.status,
          })),
          missingUnits: product.trackingType === "quantity" ? 0 : line.pieces - lineUnits.length,
        };
      });
      const ownPayments = payments.filter((p) => p.deliveryId === row.id);
      const knownTotal = own.reduce(
        (sum, l) => sum + (layers.get(l.layerId)!.costTotalCents ?? 0),
        0,
      );
      const paid = ownPayments.reduce((sum, p) => sum + p.amountCents, 0);
      const warnedPlaces = [
        ...new Set(ownPayments.filter((p) => p.drawerNegative).map((p) => p.moneyPlaceId)),
      ];
      return {
        id: row.id,
        number: row.number,
        supplier: { id: row.supplierId, name: supplierNames.get(row.supplierId) ?? "" },
        location: { id: row.locationId, name: locationNames.get(row.locationId) ?? "" },
        invoiceNumber: row.invoiceNumber,
        note: row.note,
        paymentRule: ruleOf(row),
        knownTotalCents: showMoney ? knownTotal : null,
        pendingCostLines: outLines.filter((l) => l.costState === "pending").length,
        paidCents: showMoney ? paid : null,
        owedCents: showMoney ? knownTotal - paid : null,
        dueDate: showMoney ? row.dueDate : null,
        incompleteUnits: outLines.reduce((sum, l) => sum + l.missingUnits, 0),
        lines: outLines,
        payments: showMoney
          ? ownPayments.map((p) => ({
              moneyPlace: { id: p.moneyPlaceId, name: placeNames.get(p.moneyPlaceId) ?? "" },
              amountCents: p.amountCents,
            }))
          : [],
        warnings: showMoney
          ? warnedPlaces.map((moneyPlaceId) => ({ type: "drawer_negative" as const, moneyPlaceId }))
          : [],
        createdBy: { id: row.createdByUserId, name: userNames.get(row.createdByUserId) ?? "" },
        createdAt: row.createdAt.toISOString(),
      };
    });
  }
}
