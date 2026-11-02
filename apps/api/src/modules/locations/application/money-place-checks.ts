import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { badRequest } from "../../../common/errors/app-error";
import { LocationErrors } from "../domain/location-errors";
import { canSettle, isValidMoneyPlaceNumber, type LocationScope } from "../domain/location-scope";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";

/** Checks shared by creating and editing money places. */
@Injectable()
export class MoneyPlaceChecks {
  constructor(
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
  ) {}

  /** M-Pesa numbers are digits only (400 `validation_failed`, like a schema error). */
  number(type: string, value: string | null | undefined): void {
    if (!isValidMoneyPlaceNumber(type, value)) {
      throw badRequest("validation_failed", "Request validation failed", [
        { path: "number", message: "invalid_number" },
      ]);
    }
  }

  /**
   * `settlesToId` must name a bank money place of this business (not the place
   * itself), and only M-Pesa places settle to a bank. A non-owner may only name a
   * bank linked to at least one of their own locations (S1a review #10): banks
   * they cannot see are treated as unknown. Otherwise 400 `invalid_settles_to`.
   */
  async settlesTo(
    type: string,
    settlesToId: string | null | undefined,
    selfId: string | null,
    scope: LocationScope,
    t: TenantTx,
  ): Promise<void> {
    if (!settlesToId) return;
    if (!canSettle(type) || settlesToId === selfId) throw LocationErrors.invalidSettlesTo();
    const target = await this.places.findById(t.tenantId, settlesToId, t);
    if (!target || target.type !== "bank") throw LocationErrors.invalidSettlesTo();
    if (scope === null) return;
    const linked = (await this.links.activeByPlace(t.tenantId, [target.id], t)).get(target.id);
    if (!linked?.some((locationId) => scope.has(locationId))) {
      throw LocationErrors.invalidSettlesTo();
    }
  }
}
