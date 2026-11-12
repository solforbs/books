import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { LedgerService } from "../../ledger/application/ledger.service";
import { LocationsService } from "../../locations/application/locations.service";
import type { LocationScope } from "../../locations/domain/location-scope";
import { DeliveryErrors } from "../domain/delivery-errors";

export interface PlannedPayment {
  moneyPlaceId: string;
  amountCents: number;
  /** This payment takes a cash drawer below zero (allowed for owners and managers only). */
  drawerNegative: boolean;
}

/**
 * Checks the payments of a new delivery (F04 sections 3 and 9.7): each from a money place the
 * person may use (400 `money_place_not_found` otherwise), the sum not above the known total
 * (400 `payment_exceeds_total`), and a cash drawer that would end below zero only for an owner
 * or manager (409 `insufficient_funds` otherwise). Only drawers are checked: other money places
 * may go below zero (open question, a bank or M-Pesa balance is not tracked before F07).
 */
@Injectable()
export class PaymentPlanner {
  constructor(
    private readonly locations: LocationsService,
    private readonly ledger: LedgerService,
  ) {}

  async plan(
    t: TenantTx,
    payments: { moneyPlaceId: string; amountCents: number }[],
    knownTotalCents: number,
    scope: LocationScope,
    mayOverdraw: boolean,
  ): Promise<PlannedPayment[]> {
    if (payments.length === 0) return [];
    const ids = [...new Set(payments.map((p) => p.moneyPlaceId))];
    const places = await this.locations.payablePlaces(t.tenantId, ids, scope, t);
    for (const id of ids) if (!places.has(id)) throw DeliveryErrors.moneyPlaceNotFound(id);

    const paid = payments.reduce((sum, p) => sum + p.amountCents, 0);
    if (paid > knownTotalCents) throw DeliveryErrors.paymentExceedsTotal(knownTotalCents, paid);

    const balances = await this.ledger.moneyPlaceBalances(t.tenantId, ids, t);
    const running = new Map(balances);
    return payments.map((p) => {
      const after = (running.get(p.moneyPlaceId) ?? 0) - p.amountCents;
      running.set(p.moneyPlaceId, after);
      const drawerNegative = places.get(p.moneyPlaceId)!.type === "cash_drawer" && after < 0;
      if (drawerNegative && !mayOverdraw) throw DeliveryErrors.insufficientFunds(p.moneyPlaceId);
      return { moneyPlaceId: p.moneyPlaceId, amountCents: p.amountCents, drawerNegative };
    });
  }
}
