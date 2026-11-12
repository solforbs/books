import { Injectable } from "@nestjs/common";
import type { DeliveriesResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { locationScopeOf } from "../../locations/domain/location-scope";
import { DeliveriesRepository } from "../infrastructure/deliveries.repository";
import { assertPermission } from "./access";
import { DeliveryView } from "./delivery-view";

export interface DeliveryListQuery {
  supplierId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  limit: number;
  /** Delivery number of the last row of the previous page. */
  before?: number;
}

export const encodeDeliveryCursor = (number: number) =>
  Buffer.from(JSON.stringify([number])).toString("base64url");

/** `null` when the cursor is not one this API handed out. */
export function decodeDeliveryCursor(raw: string): number | null {
  try {
    const [number] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown[];
    return Number.isSafeInteger(number) && (number as number) > 0 ? (number as number) : null;
  } catch {
    return null;
  }
}

/**
 * `GET /deliveries` (receive_stock): newest first, paged by an opaque cursor. People limited
 * to some locations only see deliveries made at those.
 */
@Injectable()
export class ListDeliveriesUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly deliveries: DeliveriesRepository,
    private readonly view: DeliveryView,
  ) {}

  async execute(
    access: TenantAccessContext,
    query: DeliveryListQuery,
  ): Promise<DeliveriesResponse> {
    assertPermission(access, "receive_stock");
    const scope = locationScopeOf(access);
    return this.tenantDb.transaction(access.tenantId, async (t) => {
      const rows = await this.deliveries.search(
        access.tenantId,
        { ...query, locationIds: scope === null ? null : [...scope] },
        t,
      );
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        deliveries: await this.view.many(access, page, t),
        nextCursor: rows.length > query.limit && last ? encodeDeliveryCursor(last.number) : null,
      };
    });
  }
}
