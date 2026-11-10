import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { LocationErrors } from "../domain/location-errors";
import { MoneyPlaceLocationsRepository } from "../infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import type { LocationRow } from "../infrastructure/tables/locations.table";
import { MoneyPlaceBalanceProbe } from "./contents-probes";

/**
 * Each selling location has its own cash drawer, created by the system (F02 §3).
 * The drawer carries the location's name; the app shows it as "Cash drawer".
 * Switching selling off hides the drawer (never deletes it, G4); switching it
 * on again shows the same drawer, or creates one if it never existed.
 */
@Injectable()
export class CashDrawers {
  constructor(
    private readonly places: MoneyPlacesRepository,
    private readonly links: MoneyPlaceLocationsRepository,
    private readonly balances: MoneyPlaceBalanceProbe,
  ) {}

  /** Returns the drawer id and whether it was newly created. */
  async ensure(location: LocationRow, t: TenantTx): Promise<{ id: string; created: boolean }> {
    const existing = (await this.places.drawersOf(t.tenantId, [location.id], t)).get(location.id);
    if (existing) {
      if (existing.hidden) {
        await this.places.updateById(
          t.tenantId,
          existing.id,
          { hidden: false, name: location.name },
          t,
        );
      }
      return { id: existing.id, created: false };
    }
    const drawer = await this.places.create(
      t.tenantId,
      { type: "cash_drawer", name: location.name, drawerLocationId: location.id },
      t,
    );
    await this.links.replace(t.tenantId, drawer.id, [location.id], t);
    return { id: drawer.id, created: true };
  }

  /** Selling switched off: the drawer must be empty, then it is hidden. */
  async hide(location: LocationRow, t: TenantTx): Promise<void> {
    const drawer = (await this.places.drawersOf(t.tenantId, [location.id], t)).get(location.id);
    if (!drawer || drawer.hidden) return;
    const balance = await this.balances.balanceOf(t.tenantId, drawer.id);
    if (balance !== 0)
      throw LocationErrors.locationNotEmpty({ stockQuantity: 0, cashDrawerCents: balance });
    await this.places.updateById(t.tenantId, drawer.id, { hidden: true }, t);
  }

  /** Keeps the drawer's name in step with its location. */
  async rename(location: LocationRow, t: TenantTx): Promise<void> {
    const drawer = (await this.places.drawersOf(t.tenantId, [location.id], t)).get(location.id);
    if (drawer) await this.places.updateById(t.tenantId, drawer.id, { name: location.name }, t);
  }
}
