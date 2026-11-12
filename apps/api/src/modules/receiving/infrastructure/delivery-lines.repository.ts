import { Injectable } from "@nestjs/common";
import { asc, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { deliveryLines, type DeliveryLineRow } from "./tables/delivery-lines.table";

@Injectable()
export class DeliveryLinesRepository extends TenantScopedRepository<typeof deliveryLines> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, deliveryLines);
  }

  /** Lines of these deliveries, in the order they were typed. */
  forDeliveries(
    tenantId: string,
    deliveryIds: string[],
    within?: TenantTx,
  ): Promise<DeliveryLineRow[]> {
    const valid = deliveryIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(deliveryLines.deliveryId, valid),
      { orderBy: [asc(deliveryLines.deliveryId), asc(deliveryLines.lineNo)] },
      within,
    );
  }
}
