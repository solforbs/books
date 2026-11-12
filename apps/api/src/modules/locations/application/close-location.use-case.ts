import { Injectable } from "@nestjs/common";
import type { LocationResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationErrors } from "../domain/location-errors";
import { canSeeMoney, inScope, locationScopeOf } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { isEmpty, LocationContentsProbe } from "./contents-probes";
import { LocationView } from "./location-view";

/**
 * `POST /locations/:id/close` (manage_locations). Refused for the last open
 * location (`last_location`) and while it holds stock or cash
 * (`location_not_empty`). Staff working there are unassigned (F02 §8.3); the
 * location and its history stay (G4). Closing a closed location changes nothing.
 */
@Injectable()
export class CloseLocationUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly locations: LocationsRepository,
    private readonly contents: LocationContentsProbe,
    private readonly members: MembersService,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, id: string): Promise<LocationResponse> {
    const { tenantId } = actor.access;
    const result = await this.tenantDb.transaction(tenantId, async (t) => {
      // Lock every open location first (one order for all callers), then decide.
      const open = await this.locations.lockOpen(tenantId, t);
      const row = await this.locations.findById(tenantId, id, t);
      if (!row || !inScope(locationScopeOf(actor.access), row.id)) {
        throw LocationErrors.locationNotFound();
      }
      if (row.status === "closed") {
        return {
          location: await this.view.location(tenantId, row, t),
          changed: false,
          unassigned: [],
        };
      }
      if (open.length <= 1) throw LocationErrors.lastLocation();
      const contents = await this.contents.contentsOf(tenantId, row.id);
      if (!isEmpty(contents))
        throw LocationErrors.locationNotEmpty(contents, canSeeMoney(actor.access));

      await this.locations.updateById(tenantId, row.id, { status: "closed" }, t);
      const unassigned = await this.members.unassignLocation(t, row.id);
      const closed = { ...row, status: "closed" as const };
      return { location: await this.view.location(tenantId, closed, t), changed: true, unassigned };
    });
    result.unassigned.forEach((userId) => this.members.forget(userId));
    if (result.changed) {
      await this.audit.record({
        ...auditBase(actor),
        action: "location_closed",
        targetId: id,
        details: {
          before: { status: "open" },
          after: { status: "closed" },
          unassignedStaff: result.unassigned.length,
        },
      });
    }
    return { location: result.location };
  }
}
