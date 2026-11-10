import { Injectable } from "@nestjs/common";
import { effectivePermissions, type MoneyPlacesResponse } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { locationScopeOf } from "../domain/location-scope";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import { LocationView } from "./location-view";

/**
 * `GET /money-places`: owners see every place, hidden ones too (`hidden: true`).
 * Everyone else sees the places linked to one of their locations (T3); hidden
 * ones only if they have manage_locations.
 */
@Injectable()
export class ListMoneyPlacesUseCase {
  constructor(
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
    private readonly view: LocationView,
  ) {}

  async execute(access: TenantAccessContext): Promise<MoneyPlacesResponse> {
    const scope = locationScopeOf(access);
    let rows = await this.places.all(access.tenantId);
    if (scope !== null) {
      // Whoever can manage places also sees hidden ones (to show them again).
      const seesHidden = effectivePermissions(access.role, access.permissionOverrides).has(
        "manage_locations",
      );
      const links = await this.links.activeByPlace(access.tenantId, null);
      rows = rows.filter(
        (r) =>
          (seesHidden || !r.hidden) &&
          (links.get(r.id) ?? []).some((locationId) => scope.has(locationId)),
      );
    }
    return { moneyPlaces: await this.view.moneyPlaces(access.tenantId, rows, scope) };
  }
}
