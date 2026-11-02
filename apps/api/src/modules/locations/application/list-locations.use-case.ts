import { Injectable } from "@nestjs/common";
import type { LocationsResponse } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { inScope, locationScopeOf } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { LocationView } from "./location-view";

/**
 * `GET /locations`: owners see every location, open and closed (so they can
 * reopen one); everyone else sees only the open locations they are assigned to.
 */
@Injectable()
export class ListLocationsUseCase {
  constructor(
    private readonly locations: LocationsRepository,
    private readonly view: LocationView,
  ) {}

  async execute(access: TenantAccessContext): Promise<LocationsResponse> {
    const scope = locationScopeOf(access);
    const rows = (await this.locations.all(access.tenantId)).filter(
      (r) => inScope(scope, r.id) && (scope === null || r.status === "open"),
    );
    return { locations: await this.view.locations(access.tenantId, rows) };
  }
}
