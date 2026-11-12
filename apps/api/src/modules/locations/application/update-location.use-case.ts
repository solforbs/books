import { Injectable } from "@nestjs/common";
import type { LocationResponse, updateLocationRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationErrors } from "../domain/location-errors";
import { canSeeMoney, inScope, locationScopeOf } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { CashDrawers } from "./cash-drawers";
import { LocationView } from "./location-view";

export type UpdateLocationInput = z.output<typeof updateLocationRequestSchema>;

/**
 * `PATCH /locations/:id` (manage_locations; non-owners only at their own
 * locations). Renaming keeps history (rows keep the id). Switching selling on
 * creates or shows the drawer; switching it off needs an empty drawer, which is
 * then hidden.
 */
@Injectable()
export class UpdateLocationUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly locations: LocationsRepository,
    private readonly drawers: CashDrawers,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string, input: UpdateLocationInput): Promise<LocationResponse> {
    const { tenantId } = actor.access;
    const { before, location } = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.locations.lockById(tenantId, id, t);
      if (!row || !inScope(locationScopeOf(actor.access), row.id)) {
        throw LocationErrors.locationNotFound();
      }
      if (row.status === "closed") throw LocationErrors.locationClosed();
      await this.locations.updateById(tenantId, row.id, input, t);
      const updated = { ...row, ...input };
      if (input.canSell === true && !row.canSell) await this.drawers.ensure(updated, t);
      if (input.canSell === false && row.canSell)
        await this.drawers.hide(updated, t, canSeeMoney(actor.access));
      if (input.name !== undefined && input.name !== row.name) {
        await this.drawers.rename(updated, t);
      }
      const fresh = (await this.locations.findById(tenantId, row.id, t))!;
      return { before: row, location: await this.view.location(tenantId, fresh, t) };
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "location_updated",
      targetId: location.id,
      details: {
        before: { name: before.name, canSell: before.canSell, priceList: before.priceList },
        after: { name: location.name, canSell: location.canSell, priceList: location.priceList },
      },
    });
    return { location };
  }
}
