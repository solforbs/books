import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";

/** Public read interface of the receiving module for other modules (the stock lookup). */
@Injectable()
export class DeliveryDirectory {
  constructor(private readonly deliveries: DeliveriesRepository) {}

  /** The running number of each delivery, by id. */
  async numbersByIds(
    tenantId: string,
    ids: string[],
    within?: TenantTx,
  ): Promise<Map<string, number>> {
    const unique = [...new Set(ids)];
    const rows = await Promise.all(
      unique.map((id) => this.deliveries.findById(tenantId, id, within)),
    );
    return new Map(rows.filter((r) => r !== null).map((r) => [r.id, r.number]));
  }
}
