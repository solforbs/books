import { Injectable } from "@nestjs/common";
import type { MoneyPlaceType } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { LocationErrors } from "../domain/location-errors";
import { inScope, type LocationScope } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";

/** A money place a person may pay from. */
export interface PayableMoneyPlace {
  id: string;
  name: string;
  type: MoneyPlaceType;
}

/** Public interface of the locations module for other modules (staff, receiving, stock). */
@Injectable()
export class LocationsService {
  constructor(
    private readonly locations: LocationsRepository,
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
  ) {}

  /**
   * Every id must be an open location of this business inside the caller's
   * scope (null = owner, any location); otherwise 400 `location_not_found`
   * with the offending ids in `details.locationIds`.
   */
  async assertUsable(
    tenantId: string,
    ids: string[],
    scope: LocationScope,
    within?: TenantTx,
  ): Promise<void> {
    const wanted = [...new Set(ids)];
    const rows = await this.locations.findOpenByIds(tenantId, wanted, within);
    const usable = new Set(rows.filter((r) => inScope(scope, r.id)).map((r) => r.id));
    const missing = wanted.filter((id) => !usable.has(id));
    if (missing.length > 0) {
      throw LocationErrors.locationNotFound(400, { locationIds: missing });
    }
  }

  /** Names of locations (any status) by id. */
  async namesOf(tenantId: string, ids: string[], within?: TenantTx): Promise<Map<string, string>> {
    const rows = await this.locations.findManyByIds(tenantId, ids, within);
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  /** Locations the scope can see, any status: id to name (for the stock list filters). */
  async visibleNames(
    tenantId: string,
    scope: LocationScope,
    within?: TenantTx,
  ): Promise<Map<string, string>> {
    const rows = await this.locations.all(tenantId, within);
    return new Map(rows.filter((r) => inScope(scope, r.id)).map((r) => [r.id, r.name]));
  }

  /**
   * The money places among `ids` that a person may pay from: not hidden, and linked to at
   * least one location inside their scope (owners: every place). Others are simply absent.
   */
  async payablePlaces(
    tenantId: string,
    ids: string[],
    scope: LocationScope,
    within?: TenantTx,
  ): Promise<Map<string, PayableMoneyPlace>> {
    const wanted = [...new Set(ids)];
    const rows = (await this.places.all(tenantId, within)).filter(
      (r) => wanted.includes(r.id) && !r.hidden,
    );
    const links = scope === null ? null : await this.links.activeByPlace(tenantId, wanted, within);
    const usable = rows.filter(
      (r) => scope === null || (links!.get(r.id) ?? []).some((locationId) => scope.has(locationId)),
    );
    return new Map(usable.map((r) => [r.id, { id: r.id, name: r.name, type: r.type }]));
  }

  /** Names of money places (any status) by id. */
  async placeNamesOf(
    tenantId: string,
    ids: string[],
    within?: TenantTx,
  ): Promise<Map<string, string>> {
    const wanted = new Set(ids);
    const rows = await this.places.all(tenantId, within);
    return new Map(rows.filter((r) => wanted.has(r.id)).map((r) => [r.id, r.name]));
  }
}
