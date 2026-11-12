import { Injectable } from "@nestjs/common";
import type { DeliveryLineInput, PaymentRule } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { ProductDirectory } from "../../catalog/application/product-directory";
import type { PackUnitRow } from "../../catalog/infrastructure/tables/product-pack-units.table";
import type { ProductRow } from "../../catalog/infrastructure/tables/products.table";
import { SupplierDirectory } from "../../suppliers/application/supplier-directory";
import { ruleOf } from "../../suppliers/domain/payment-rule";
import type { SupplierRow } from "../../suppliers/infrastructure/tables/suppliers.table";
import { DeliveryErrors } from "../domain/delivery-errors";

/** A request line with its product and pack looked up, and the quantity in pieces. */
export interface ResolvedLine {
  input: DeliveryLineInput;
  product: ProductRow;
  pack: PackUnitRow | null;
  pieces: number;
}

const RECEIVABLE = ["active", "waiting"];

/** Looks up and checks the supplier and the products named in a delivery request. */
@Injectable()
export class DeliveryIntake {
  constructor(
    private readonly suppliers: SupplierDirectory,
    private readonly products: ProductDirectory,
  ) {}

  /**
   * An active or waiting supplier paid in KES (F03 section 9.10; US dollars are F04b). Returns
   * the row and the payment rule the delivery is made under (this delivery only, or the
   * supplier own rule).
   */
  async supplier(
    t: TenantTx,
    supplierId: string,
    ruleOverride: PaymentRule | undefined,
  ): Promise<{ supplier: SupplierRow; rule: PaymentRule }> {
    const supplier = await this.suppliers.findById(t.tenantId, supplierId, t);
    if (!supplier || !RECEIVABLE.includes(supplier.status)) throw DeliveryErrors.supplierNotFound();
    if (supplier.currency !== "KES") throw DeliveryErrors.supplierCurrency();
    return { supplier, rule: ruleOverride ?? ruleOf(supplier) };
  }

  async lines(t: TenantTx, lines: DeliveryLineInput[]): Promise<ResolvedLine[]> {
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = new Map(
      (await this.products.byIds(t.tenantId, productIds, t)).map((p) => [p.id, p]),
    );
    const packs = new Map(
      (await this.products.packsOf(t.tenantId, productIds, t)).map((p) => [p.id, p]),
    );
    return lines.map((input) => {
      const product = products.get(input.productId);
      if (!product) throw DeliveryErrors.productNotFound(input.productId);
      if (!RECEIVABLE.includes(product.status)) {
        throw DeliveryErrors.productNotReceivable(product.id, product.status);
      }
      let pack: PackUnitRow | null = null;
      if (input.packUnitId) {
        pack = packs.get(input.packUnitId) ?? null;
        // Packs exist for quantity products only (F01); a retired pack cannot be used.
        if (
          !pack ||
          pack.productId !== product.id ||
          !pack.active ||
          product.trackingType !== "quantity"
        ) {
          throw DeliveryErrors.invalidPackUnit(product.id, input.packUnitId);
        }
      }
      return { input, product, pack, pieces: input.quantity * (pack?.size ?? 1) };
    });
  }
}
