import { Injectable } from "@nestjs/common";
import type { Location, MoneyPlace } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { visibleIds, type LocationScope } from "../domain/location-scope";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import type { LocationRow } from "../infrastructure/tables/locations.table";
import type { MoneyPlaceRow } from "../infrastructure/tables/money-places.table";

/** Builds the contract's Location and MoneyPlace shapes from stored rows. */
@Injectable()
export class LocationView {
  constructor(
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
  ) {}

  async locations(tenantId: string, rows: LocationRow[], within?: TenantTx): Promise<Location[]> {
    const drawers = await this.places.drawersOf(
      tenantId,
      rows.map((r) => r.id),
      within,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      canSell: r.canSell,
      priceList: r.priceList,
      status: r.status,
      // A location that does not sell has no (visible) drawer, even if one was kept (G4).
      cashDrawerId: r.canSell ? (drawers.get(r.id)?.id ?? null) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async location(tenantId: string, row: LocationRow, within?: TenantTx): Promise<Location> {
    return (await this.locations(tenantId, [row], within))[0]!;
  }

  /** Links outside the caller's scope are left out, so ids of unseen locations never leak. */
  async moneyPlaces(
    tenantId: string,
    rows: MoneyPlaceRow[],
    scope: LocationScope,
    within?: TenantTx,
  ): Promise<MoneyPlace[]> {
    const links = await this.links.activeByPlace(
      tenantId,
      rows.map((r) => r.id),
      within,
    );
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      number: r.number,
      settlesToId: r.settlesToId,
      locationIds: visibleIds(scope, links.get(r.id) ?? []),
      hidden: r.hidden,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async moneyPlace(tenantId: string, row: MoneyPlaceRow, scope: LocationScope, t?: TenantTx) {
    return (await this.moneyPlaces(tenantId, [row], scope, t))[0]!;
  }
}
