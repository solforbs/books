import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { LocationErrors } from "../domain/location-errors";
import { inScope, type LocationScope } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";

/** Public interface of the locations module for other modules (e.g. staff). */
@Injectable()
export class LocationsService {
  constructor(private readonly locations: LocationsRepository) {}

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
}
