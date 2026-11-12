import { Injectable } from "@nestjs/common";
import type { MoneyPlaceResponse, updateMoneyPlaceRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationErrors } from "../domain/location-errors";
import {
  canSeeMoney,
  inScope,
  locationScopeOf,
  type LocationScope,
} from "../domain/location-scope";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import type { MoneyPlaceRow } from "../infrastructure/tables/money-places.table";
import { MoneyPlaceBalanceProbe } from "./contents-probes";
import { LocationView } from "./location-view";
import { LocationsService } from "./locations.service";
import { MoneyPlaceChecks } from "./money-place-checks";

export type UpdateMoneyPlaceInput = z.output<typeof updateMoneyPlaceRequestSchema>;

/**
 * `PATCH /money-places/:id` (manage_locations). Non-owners only touch places
 * linked to their locations, and links to locations they cannot see are kept.
 * Hiding needs a zero balance (`money_place_not_empty`). A cash drawer follows
 * its location: only its name can change.
 */
@Injectable()
export class UpdateMoneyPlaceUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
    private readonly locations: LocationsService,
    private readonly checks: MoneyPlaceChecks,
    private readonly balances: MoneyPlaceBalanceProbe,
    private readonly view: LocationView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    actor: Actor,
    id: string,
    input: UpdateMoneyPlaceInput,
  ): Promise<MoneyPlaceResponse> {
    const { tenantId } = actor.access;
    const scope = locationScopeOf(actor.access);
    const { before, moneyPlace } = await this.tenantDb.transaction(tenantId, async (t) => {
      const row = await this.places.findById(tenantId, id, t);
      const current = row
        ? ((await this.links.activeByPlace(tenantId, [row.id], t)).get(row.id) ?? [])
        : [];
      if (!row || (scope !== null && !current.some((l) => scope.has(l)))) {
        throw LocationErrors.moneyPlaceNotFound();
      }
      const before = await this.view.moneyPlace(tenantId, row, scope, t);
      await this.apply(row, current, input, scope, t, canSeeMoney(actor.access));
      const fresh = (await this.places.findById(tenantId, row.id, t))!;
      return { before, moneyPlace: await this.view.moneyPlace(tenantId, fresh, scope, t) };
    });
    await this.audit.record({
      ...auditBase(actor),
      action: "money_place_updated",
      targetId: moneyPlace.id,
      details: { before: summary(before), after: summary(moneyPlace) },
    });
    return { moneyPlace };
  }

  private async apply(
    row: MoneyPlaceRow,
    current: string[],
    input: UpdateMoneyPlaceInput,
    scope: LocationScope,
    t: TenantTx,
    showMoney: boolean,
  ): Promise<void> {
    const { locationIds, ...fields } = input;
    if (row.type === "cash_drawer" && Object.keys(input).some((k) => k !== "name")) {
      throw LocationErrors.cashDrawerFixed();
    }
    if (fields.number !== undefined) this.checks.number(row.type, fields.number);
    if (fields.settlesToId !== undefined) {
      await this.checks.settlesTo(row.type, fields.settlesToId, row.id, scope, t);
    }
    if (fields.hidden === true && !row.hidden) {
      const balance = await this.balances.balanceOf(t.tenantId, row.id);
      if (balance !== 0) throw LocationErrors.moneyPlaceNotEmpty(balance, showMoney);
    }
    if (locationIds !== undefined) {
      await this.locations.assertUsable(t.tenantId, locationIds, scope, t);
      // A manager edits only their own locations' links; the others stay as they were.
      const unseen = current.filter((l) => !inScope(scope, l));
      await this.links.replace(t.tenantId, row.id, [...unseen, ...locationIds], t);
    }
    if (Object.keys(fields).length > 0) {
      const set = { ...fields };
      if (set.number !== undefined) set.number = set.number || null; // "" clears it
      await this.places.updateById(t.tenantId, row.id, set, t);
    }
  }
}

/** Audit before/after. `number` is a business till/paybill/bank number: kept in full. */
const summary = (p: {
  name: string;
  number: string | null;
  hidden: boolean;
  settlesToId: string | null;
  locationIds: string[];
}) => ({
  name: p.name,
  number: p.number,
  hidden: p.hidden,
  settlesToId: p.settlesToId,
  locationIds: p.locationIds,
});
