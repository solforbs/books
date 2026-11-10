import { Injectable } from "@nestjs/common";
import type { MoneyPlaceResponse, createMoneyPlaceRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { locationScopeOf } from "../domain/location-scope";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import { LocationView } from "./location-view";
import { LocationsService } from "./locations.service";
import { MoneyPlaceChecks } from "./money-place-checks";

export type CreateMoneyPlaceInput = z.output<typeof createMoneyPlaceRequestSchema>;

/**
 * `POST /money-places` (manage_locations): an M-Pesa Till/Paybill, bank or safe,
 * added once and linked to one or several open locations (shared or separate,
 * F02 §3). Non-owners can only link their own locations.
 */
@Injectable()
export class CreateMoneyPlaceUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
    private readonly locations: LocationsService,
    private readonly checks: MoneyPlaceChecks,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: CreateMoneyPlaceInput): Promise<MoneyPlaceResponse> {
    const { tenantId } = actor.access;
    const scope = locationScopeOf(actor.access);
    this.checks.number(input.type, input.number);
    const moneyPlace = await this.tenantDb.transaction(tenantId, async (t) => {
      await this.locations.assertUsable(tenantId, input.locationIds, scope, t);
      await this.checks.settlesTo(input.type, input.settlesToId, null, scope, t);
      const row = await this.places.create(
        tenantId,
        {
          type: input.type,
          name: input.name,
          number: input.number || null,
          settlesToId: input.settlesToId ?? null,
        },
        t,
      );
      await this.links.replace(tenantId, row.id, input.locationIds, t);
      return this.view.moneyPlace(tenantId, row, scope, t);
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "money_place_created",
      targetId: moneyPlace.id,
      details: {
        after: {
          type: moneyPlace.type,
          name: moneyPlace.name,
          // A business till/paybill/bank number, not personal data: kept in full.
          number: moneyPlace.number,
          settlesToId: moneyPlace.settlesToId,
          locationIds: moneyPlace.locationIds,
        },
      },
    });
    return { moneyPlace };
  }
}
