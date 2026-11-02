import { Injectable } from "@nestjs/common";
import type { LocationResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationErrors } from "../domain/location-errors";
import { inScope, locationScopeOf } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { LocationView } from "./location-view";

/**
 * `POST /locations/:id/reopen` (manage_locations). Staff are not re-assigned
 * automatically; the owner assigns them again. Reopening an open location
 * changes nothing. Closed locations have nobody assigned, so in practice only
 * owners can see (and reopen) them.
 */
@Injectable()
export class ReopenLocationUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly locations: LocationsRepository,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<LocationResponse> {
    const { tenantId } = actor.access;
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.locations.lockById(tenantId, id, t);
      if (!row || !inScope(locationScopeOf(actor.access), row.id)) {
        throw LocationErrors.locationNotFound();
      }
      if (row.status === "open") {
        return { location: await this.view.location(tenantId, row, t), changed: false };
      }
      await this.locations.updateById(tenantId, row.id, { status: "open" }, t);
      const reopened = { ...row, status: "open" as const };
      return { location: await this.view.location(tenantId, reopened, t), changed: true };
    });
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "location_reopened",
        targetId: id,
        details: { before: { status: "closed" }, after: { status: "open" } },
      });
    }
    return { location: result.location };
  }
}
