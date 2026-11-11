import { Injectable } from "@nestjs/common";

/**
 * EXTENSION POINT (F03 section 9.8): a supplier can be hidden only when the shop owes it
 * nothing. Balances do not exist until deliveries (F04) and payments (F07) do, so this reports
 * zero. Those modules replace it; any non-zero value blocks hiding (409 `supplier_has_balance`).
 * The unit is decided when balances are built: the use case only compares with zero.
 */
@Injectable()
export class SupplierBalanceProbe {
  async balanceOf(_tenantId: string, _supplierId: string): Promise<number> {
    return 0;
  }
}
