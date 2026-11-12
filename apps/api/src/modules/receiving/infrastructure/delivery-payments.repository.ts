import { Injectable } from "@nestjs/common";
import { asc, inArray } from "drizzle-orm";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { deliveryPayments, type DeliveryPaymentRow } from "./tables/delivery-payments.table";

@Injectable()
export class DeliveryPaymentsRepository extends TenantScopedRepository<typeof deliveryPayments> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, deliveryPayments);
  }

  forDeliveries(
    tenantId: string,
    deliveryIds: string[],
    within?: TenantTx,
  ): Promise<DeliveryPaymentRow[]> {
    const valid = deliveryIds.filter(isUuid);
    if (valid.length === 0) return Promise.resolve([]);
    return this.find(
      tenantId,
      inArray(deliveryPayments.deliveryId, valid),
      { orderBy: [asc(deliveryPayments.createdAt), asc(deliveryPayments.id)] },
      within,
    );
  }
}
