import { Injectable } from "@nestjs/common";
import type { UnitLookupResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { ProductDirectory } from "../../catalog/application/product-directory";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { LocationsService } from "../../locations/application/locations.service";
import { inScope, locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveryDirectory } from "../../receiving/application/delivery-directory";
import { assertCanReadStock, canSeeStockCosts } from "./stock-access";
import { StockService } from "./stock.service";

/**
 * `GET /stock/lookup?number=` (same permissions as the stock list): every unit in the business
 * that has this number as IMEI, second IMEI or serial, any status, newest first. People limited
 * to some locations only see units at those locations. Cost is null without see_cost_profit.
 */
@Injectable()
export class LookupUnitUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly stock: StockService,
    private readonly products: ProductDirectory,
    private readonly locations: LocationsService,
    private readonly deliveries: DeliveryDirectory,
  ) {}

  async execute(access: TenantAccessContext, number: string): Promise<UnitLookupResponse> {
    assertCanReadStock(access);
    const { tenantId } = access;
    const scope = locationScopeOf(access);
    const showCost = canSeeStockCosts(access);
    return this.tenantDb.transaction(tenantId, async (t) => {
      const found = await this.stock.lookupUnits(tenantId, number, t);
      const units = found.filter((u) => inScope(scope, u.locationId));
      const layers = new Map(
        (
          await this.stock.layersByIds(
            tenantId,
            units.map((u) => u.layerId),
            t,
          )
        ).map((l) => [l.id, l]),
      );
      const products = new Map(
        (
          await this.products.byIds(
            tenantId,
            units.map((u) => u.productId),
            t,
          )
        ).map((p) => [p.id, p]),
      );
      const locationNames = await this.locations.namesOf(
        tenantId,
        units.map((u) => u.locationId),
        t,
      );
      const numbers = await this.deliveries.numbersByIds(
        tenantId,
        [...layers.values()].map((l) => l.sourceId),
        t,
      );
      return {
        units: units.map((u) => {
          const layer = layers.get(u.layerId)!;
          return {
            id: u.id,
            imei: u.imei,
            imei2: u.imei2,
            serial: u.serial,
            status: u.status,
            product: { id: u.productId, name: products.get(u.productId)?.name ?? "" },
            location: { id: u.locationId, name: locationNames.get(u.locationId) ?? "" },
            deliveryId: layer.sourceId,
            deliveryNumber: numbers.get(layer.sourceId) ?? 0,
            receivedAt: layer.receivedAt.toISOString(),
            costCents: showCost ? u.costCents : null,
          };
        }),
      };
    });
  }
}
