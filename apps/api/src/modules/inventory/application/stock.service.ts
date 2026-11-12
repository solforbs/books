import { Injectable } from "@nestjs/common";
import { normalizeImei } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { splitCost } from "../domain/cost-split";
import { classifyConflicts, lockKeys, type UnitConflict } from "../domain/unit-conflicts";
import type { TrackingKind, UnitNumbers } from "../domain/unit-numbers";
import {
  StockAggregatesRepository,
  type StockFilter,
} from "../infrastructure/stock-aggregates.repository";
import { StockLayersRepository } from "../infrastructure/stock-layers.repository";
import { StockMovementsRepository } from "../infrastructure/stock-movements.repository";
import { StockUnitsRepository } from "../infrastructure/stock-units.repository";
import type { StockLayerRow } from "../infrastructure/tables/stock-layers.table";
import type { StockUnitRow } from "../infrastructure/tables/stock-units.table";

export interface ReceiveLineInput {
  productId: string;
  locationId: string;
  supplierId: string | null;
  trackingType: TrackingKind;
  pieces: number;
  /** What the supplier charged for the whole line; null = price pending. */
  costTotalCents: number | null;
  sourceType: string;
  sourceId: string;
  userId: string;
  units: UnitNumbers[];
}

/**
 * Public interface of the inventory module (ARCH-02 section 2.1): stock layers, IMEI/serial
 * units and the movement log. Other modules receive stock and read it here; nobody touches
 * these tables directly. Every write takes the caller tenant transaction.
 */
@Injectable()
export class StockService {
  constructor(
    private readonly layers: StockLayersRepository,
    private readonly units: StockUnitsRepository,
    private readonly movements: StockMovementsRepository,
    private readonly aggregates: StockAggregatesRepository,
  ) {}

  /** One layer (with its units and movements) for one delivery line. */
  async receiveLine(
    t: TenantTx,
    input: ReceiveLineInput,
  ): Promise<{ layer: StockLayerRow; units: StockUnitRow[] }> {
    const layer = await this.layers.create(
      t.tenantId,
      {
        productId: input.productId,
        locationId: input.locationId,
        supplierId: input.supplierId,
        trackingType: input.trackingType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        receivedQuantity: input.pieces,
        remainingQuantity: input.pieces,
        costTotalCents: input.costTotalCents,
      },
      t,
    );
    await this.movements.append(
      t.tenantId,
      [
        {
          type: "receive",
          productId: input.productId,
          locationId: input.locationId,
          layerId: layer.id,
          quantityDelta: input.pieces,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          createdByUserId: input.userId,
        },
      ],
      t,
    );
    const units = await this.registerUnits(t, layer, input.units, 0, input.userId);
    return { layer, units };
  }

  /** Adds IMEI/serial units to a layer saved incomplete. `existing` = units it already has. */
  addUnits(
    t: TenantTx,
    layer: StockLayerRow,
    units: UnitNumbers[],
    existing: number,
    userId: string,
  ): Promise<StockUnitRow[]> {
    return this.registerUnits(t, layer, units, existing, userId);
  }

  private async registerUnits(
    t: TenantTx,
    layer: StockLayerRow,
    numbers: UnitNumbers[],
    existing: number,
    userId: string,
  ): Promise<StockUnitRow[]> {
    if (numbers.length === 0) return [];
    // Each piece takes its own slot of the split cost, so unit costs add up to the line total.
    const costs =
      layer.costTotalCents === null
        ? null
        : splitCost(layer.costTotalCents, layer.receivedQuantity);
    const created: StockUnitRow[] = [];
    for (const [i, unit] of numbers.entries()) {
      created.push(
        await this.units.create(
          t.tenantId,
          {
            productId: layer.productId,
            locationId: layer.locationId,
            layerId: layer.id,
            imei: unit.imei,
            imei2: unit.imei2,
            serial: unit.serial,
            status: "in_stock",
            costCents: costs ? costs[existing + i]! : null,
          },
          t,
        ),
      );
    }
    await this.movements.append(
      t.tenantId,
      created.map((u) => ({
        type: "unit_added" as const,
        productId: layer.productId,
        locationId: layer.locationId,
        layerId: layer.id,
        unitId: u.id,
        quantityDelta: 0,
        sourceType: layer.sourceType,
        sourceId: layer.sourceId,
        createdByUserId: userId,
      })),
      t,
    );
    return created;
  }

  /** Locks the numbers of these units until the transaction ends (call before checking them). */
  lockUnitNumbers(
    t: TenantTx,
    groups: { productId: string; units: UnitNumbers[] }[],
  ): Promise<void> {
    return this.units.lockNumbers(
      t.tenantId,
      groups.flatMap((g) => lockKeys(g.productId, g.units)),
      t,
    );
  }

  /** What stops these numbers from being received as new stock (empty = nothing). */
  async conflictsFor(
    t: TenantTx,
    productId: string,
    units: UnitNumbers[],
  ): Promise<UnitConflict[]> {
    const imeis = units.flatMap((u) => [u.imei, u.imei2].filter((v): v is string => v !== null));
    const serials = units.map((u) => u.serial).filter((v): v is string => v !== null);
    const existing = await this.units.findByNumbers(t.tenantId, productId, imeis, serials, t);
    return classifyConflicts(productId, units, existing);
  }

  /**
   * Sets the cost of a locked layer that has none, and of the units it already has (their
   * share of the line total). The caller checks that the layer has no cost yet.
   */
  async setLayerCost(t: TenantTx, layer: StockLayerRow, totalCents: number): Promise<void> {
    await this.layers.updateById(t.tenantId, layer.id, { costTotalCents: totalCents }, t);
    const units = await this.units.forLayers(t.tenantId, [layer.id], t);
    const costs = splitCost(totalCents, layer.receivedQuantity);
    await this.units.setCosts(
      t.tenantId,
      units.map((u, i) => ({ id: u.id, costCents: costs[i]! })),
      t,
    );
  }

  lockLayers(t: TenantTx, ids: string[]) {
    return this.layers.lockManyByIds(t.tenantId, ids, t);
  }

  layersByIds(tenantId: string, ids: string[], within?: TenantTx) {
    return this.layers.findManyByIds(tenantId, ids, within);
  }

  unitsOfLayers(tenantId: string, layerIds: string[], within?: TenantTx) {
    return this.units.forLayers(tenantId, layerIds, within);
  }

  /** Stock by product and location, only rows with something on hand or waiting for IMEIs. */
  stockRows(tenantId: string, filter: StockFilter, within?: TenantTx) {
    return this.aggregates.byProductLocation(tenantId, filter, within);
  }

  /** Units carrying this IMEI or serial, any status, newest first. */
  lookupUnits(tenantId: string, number: string, within?: TenantTx): Promise<StockUnitRow[]> {
    const raw = number.trim();
    const candidates = [...new Set([raw, normalizeImei(raw)])].filter(Boolean);
    return this.units.lookup(tenantId, candidates, within);
  }

  /** Pieces held at a location: sellable plus waiting for their IMEI (closing needs zero). */
  async piecesAtLocation(tenantId: string, locationId: string): Promise<number> {
    const rows = await this.aggregates.byProductLocation(tenantId, { locationIds: [locationId] });
    return rows.reduce((sum, r) => sum + r.onHand + r.incomplete, 0);
  }

  /** Pieces of one product anywhere in the business (hiding or changing it needs zero). */
  async piecesOfProduct(tenantId: string, productId: string): Promise<number> {
    const rows = await this.aggregates.byProductLocation(tenantId, {
      locationIds: null,
      productIds: [productId],
    });
    return rows.reduce((sum, r) => sum + r.onHand + r.incomplete, 0);
  }

  /** Whether the product ever had stock (merging a product that has stock history is refused). */
  async productHasLayers(tenantId: string, productId: string): Promise<boolean> {
    return (await this.layers.countForProduct(tenantId, productId)) > 0;
  }
}
