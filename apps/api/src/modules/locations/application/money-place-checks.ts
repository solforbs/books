import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { badRequest } from "../../../common/errors/app-error";
import { LocationErrors } from "../domain/location-errors";
import { canSettle, isValidMoneyPlaceNumber } from "../domain/location-scope";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";

/** Checks shared by creating and editing money places. */
@Injectable()
export class MoneyPlaceChecks {
  constructor(private readonly places: MoneyPlacesRepository) {}

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
   * itself), and only M-Pesa places settle to a bank. Otherwise 400 `invalid_settles_to`.
   */
  async settlesTo(
    type: string,
    settlesToId: string | null | undefined,
    selfId: string | null,
    t: TenantTx,
  ): Promise<void> {
    if (!settlesToId) return;
    if (!canSettle(type) || settlesToId === selfId) throw LocationErrors.invalidSettlesTo();
    const target = await this.places.findById(t.tenantId, settlesToId, t);
    if (!target || target.type !== "bank") throw LocationErrors.invalidSettlesTo();
  }
}
