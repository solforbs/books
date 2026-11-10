import { Injectable } from "@nestjs/common";
import type { LocationContents } from "../domain/location-errors";

/**
 * EXTENSION POINT (F02 §3 "Closing a location"): how much stock and cash a
 * location still holds. Stock arrives with F04 and cash balances with F07/F11;
 * until then nothing can be held, so the default reports zero. Those slices
 * replace this provider (`{ provide: LocationContentsProbe, useClass: ... }`)
 * with one that asks the inventory and money modules.
 */
@Injectable()
export class LocationContentsProbe {
  async contentsOf(_tenantId: string, _locationId: string): Promise<LocationContents> {
    return { stockQuantity: 0, cashDrawerCents: 0 };
  }
}

/**
 * EXTENSION POINT: the balance of a money place, in cents. Hiding a money place
 * (or switching selling off, which hides the drawer) needs a zero balance.
 * Balances arrive with F07/F11; until then every place holds nothing.
 */
@Injectable()
export class MoneyPlaceBalanceProbe {
  async balanceOf(_tenantId: string, _moneyPlaceId: string): Promise<number> {
    return 0;
  }
}

export function isEmpty(contents: LocationContents): boolean {
  return contents.stockQuantity === 0 && contents.cashDrawerCents === 0;
}
