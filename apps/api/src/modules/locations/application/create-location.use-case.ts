import { Injectable } from "@nestjs/common";
import type { LocationResponse, createLocationRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { seesAllLocations } from "../../identity/domain/auth-context";
import { defaultCanSell } from "../domain/location-scope";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { CashDrawers } from "./cash-drawers";
import { LocationView } from "./location-view";

export type CreateLocationInput = z.output<typeof createLocationRequestSchema>;

/**
 * `POST /locations` (manage_locations). Shops sell and stores don't unless told
 * otherwise; a selling location gets its cash drawer in the same transaction.
 * A manager who adds a location is assigned to it, so they can see what they made.
 */
@Injectable()
export class CreateLocationUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly locations: LocationsRepository,
    private readonly drawers: CashDrawers,
    private readonly members: MembersService,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: CreateLocationInput): Promise<LocationResponse> {
    const { access } = actor;
    const canSell = input.canSell ?? defaultCanSell(input.type);
    const { location, drawerId } = await this.tenantDb.transaction(access.tenantId, async (t) => {
      const row = await this.locations.create(
        t.tenantId,
        { name: input.name, type: input.type, canSell, priceList: input.priceList },
        t,
      );
      const drawer = canSell ? await this.drawers.ensure(row, t) : null;
      if (!seesAllLocations(access)) {
        await this.members.assignLocation(t, access.membershipId, access.userId, row.id);
      }
      return { location: await this.view.location(t.tenantId, row, t), drawerId: drawer?.id };
    });
    this.members.forget(access.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: "location_created",
      targetId: location.id,
      details: { after: { name: location.name, type: location.type, canSell, drawerId } },
    });
    return { location };
  }
}
