import { Injectable } from "@nestjs/common";
import { LedgerService } from "../../ledger/application/ledger.service";

/**
 * F03 section 9.8: a supplier can be hidden only when the shop owes it nothing. The balance is
 * what we owe, in cents, from the ledger (deliveries add to it; payments in F07 reduce it).
 * Any non-zero value blocks hiding (409 `supplier_has_balance`).
 */
@Injectable()
export class SupplierBalanceProbe {
  constructor(private readonly ledger: LedgerService) {}

  balanceOf(tenantId: string, supplierId: string): Promise<number> {
    return this.ledger.supplierOwed(tenantId, supplierId);
  }
}
