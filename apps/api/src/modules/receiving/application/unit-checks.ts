import { Injectable } from "@nestjs/common";
import type { DeliveryUnitInput } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { StockService } from "../../inventory/application/stock.service";
import {
  firstDuplicate,
  prepareUnits,
  type TrackingKind,
  type UnitNumbers,
} from "../../inventory/domain/unit-numbers";
import { LocationsService } from "../../locations/application/locations.service";
import { inScope, type LocationScope } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";

/** The most IMEI/serial units one request may carry (keeps one request bounded). */
export const MAX_UNITS_PER_REQUEST = 5000;

/** The unit numbers typed for one product (one line of a delivery, or of a completion). */
export interface UnitGroup {
  productId: string;
  trackingType: TrackingKind;
  inputs: DeliveryUnitInput[];
}

/**
 * The IMEI/serial rules of F04 section 4.3, in the order of the contract: format, duplicates
 * inside the request, already in stock anywhere in the business, sold before (needs an owner
 * or manager confirmation). Counting units against the quantity is left to the caller,
 * because a new delivery and a later completion count differently.
 */
@Injectable()
export class UnitChecks {
  constructor(
    private readonly stock: StockService,
    private readonly locations: LocationsService,
  ) {}

  /**
   * Returns the cleaned numbers of each group, or throws the first problem. `mayConfirm` is
   * true only when the person is an owner or manager AND sent `confirmSoldBefore`.
   */
  async prepare(
    t: TenantTx,
    groups: UnitGroup[],
    mayConfirm: boolean,
    scope: LocationScope,
  ): Promise<UnitNumbers[][]> {
    const total = groups.reduce((sum, g) => sum + g.inputs.length, 0);
    if (total > MAX_UNITS_PER_REQUEST) {
      throw DeliveryErrors.quantityTooLarge({ max: MAX_UNITS_PER_REQUEST });
    }
    const prepared = groups.map((g) => {
      const result = prepareUnits(g.trackingType, g.inputs);
      if (result.ok) return result.units;
      if (result.problem.kind === "units_not_allowed") {
        throw DeliveryErrors.unitsNotAllowed(g.productId);
      }
      throw DeliveryErrors.invalidImei({
        value: result.problem.value,
        reason: result.problem.reason,
        productId: g.productId,
      });
    });

    const duplicate = firstDuplicate(
      groups.map((g, i) => ({ productId: g.productId, units: prepared[i]! })),
    );
    if (duplicate) throw DeliveryErrors.duplicateInDelivery(duplicate);

    const checked = groups
      .map((g, i) => ({ productId: g.productId, units: prepared[i]! }))
      .filter((g) => g.units.length > 0);
    // Lock first, then look: two requests receiving the same phone cannot both pass.
    if (checked.length > 0) await this.stock.lockUnitNumbers(t);
    const conflicts = (
      await Promise.all(checked.map((g) => this.stock.conflictsFor(t, g.productId, g.units)))
    ).flat();

    const inStock = conflicts.find((c) => c.kind === "in_stock");
    if (inStock) {
      // The shop name is only told to people who may see that location.
      const where = inStock.unit.locationId;
      const names = inScope(scope, where)
        ? await this.locations.namesOf(t.tenantId, [where], t)
        : new Map<string, string>();
      const locationName = names.get(where);
      throw DeliveryErrors.imeiInStock(
        locationName === undefined
          ? { imei: inStock.number }
          : { imei: inStock.number, locationName },
      );
    }
    const soldBefore = conflicts.find((c) => c.kind === "sold_before");
    if (soldBefore && !mayConfirm) {
      throw DeliveryErrors.imeiSoldBefore({ imei: soldBefore.number });
    }
    return prepared;
  }
}
