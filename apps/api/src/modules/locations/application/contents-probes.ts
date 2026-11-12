import { Injectable } from "@nestjs/common";
import { LedgerService } from "../../ledger/application/ledger.service";
import { StockService } from "../../inventory/application/stock.service";
import type { LocationContents } from "../domain/location-errors";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";

/**
 * F02 section 3 "Closing a location": how much stock and cash a location still holds. Stock
 * is counted from the inventory module (pieces on hand plus pieces still waiting for their
 * IMEI) and cash from the ledger balance of the location cash drawer.
 */
@Injectable()
export class LocationContentsProbe {
  constructor(
    private readonly stock: StockService,
    private readonly ledger: LedgerService,
    private readonly places: MoneyPlacesRepository,
  ) {}

  async contentsOf(tenantId: string, locationId: string): Promise<LocationContents> {
    const drawer = (await this.places.drawersOf(tenantId, [locationId])).get(locationId);
    return {
      stockQuantity: await this.stock.piecesAtLocation(tenantId, locationId),
      cashDrawerCents: drawer ? await this.ledger.moneyPlaceBalance(tenantId, drawer.id) : 0,
    };
  }
}

/**
 * The balance of a money place, in cents, from the ledger (sum of its lines). Hiding a money
 * place (or switching selling off, which hides the drawer) needs a zero balance.
 */
@Injectable()
export class MoneyPlaceBalanceProbe {
  constructor(private readonly ledger: LedgerService) {}

  balanceOf(tenantId: string, moneyPlaceId: string): Promise<number> {
    return this.ledger.moneyPlaceBalance(tenantId, moneyPlaceId);
  }
}

export function isEmpty(contents: LocationContents): boolean {
  return contents.stockQuantity === 0 && contents.cashDrawerCents === 0;
}
