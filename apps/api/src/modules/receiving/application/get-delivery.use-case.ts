import { Injectable } from "@nestjs/common";
import type { DeliveryResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { inScope, locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { assertPermission } from "./access";
import { DeliveryView } from "./delivery-view";

/**
 * `GET /deliveries/:id` (receive_stock). People limited to some locations only find
 * deliveries made at those; any other id is 404 `delivery_not_found`.
 */
@Injectable()
export class GetDeliveryUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly deliveries: DeliveriesRepository,
    private readonly view: DeliveryView,
  ) {}

  async execute(access: TenantAccessContext, id: string): Promise<DeliveryResponse> {
    assertPermission(access, "receive_stock");
    return this.tenantDb.transaction(access.tenantId, async (t) => {
      const row = await this.deliveries.findById(access.tenantId, id, t);
      if (!row || !inScope(locationScopeOf(access), row.locationId)) {
        throw DeliveryErrors.notFound();
      }
      return { delivery: (await this.view.many(access, [row], t))[0]! };
    });
  }
}
