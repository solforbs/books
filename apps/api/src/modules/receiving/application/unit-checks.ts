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
import { DeliveryErrors } from "../domain/delivery-errors";

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
  async prepare(t: TenantTx, groups: UnitGroup[], mayConfirm: boolean): Promise<UnitNumbers[][]> {
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
    await this.stock.lockUnitNumbers(t, checked);
    const conflicts = (
      await Promise.all(checked.map((g) => this.stock.conflictsFor(t, g.productId, g.units)))
    ).flat();

    const inStock = conflicts.find((c) => c.kind === "in_stock");
    if (inStock) {
      const names = await this.locations.namesOf(t.tenantId, [inStock.unit.locationId], t);
      throw DeliveryErrors.imeiInStock({
        number: inStock.number,
        locationId: inStock.unit.locationId,
        locationName: names.get(inStock.unit.locationId) ?? null,
        unitId: inStock.unit.id,
      });
    }
    const soldBefore = conflicts.find((c) => c.kind === "sold_before");
    if (soldBefore && !mayConfirm) {
      throw DeliveryErrors.imeiSoldBefore({
        number: soldBefore.number,
        since: soldBefore.unit.updatedAt.toISOString(),
        unitId: soldBefore.unit.id,
        status: soldBefore.unit.status,
      });
    }
    return prepared;
  }
}
