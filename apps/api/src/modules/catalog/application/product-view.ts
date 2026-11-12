import { Injectable } from "@nestjs/common";
import type { Product } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { BusinessDirectory } from "../../identity/application/business-directory";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { MembersService } from "../../identity/application/members.service";
import { hasPermission } from "./access";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { LocationPricesRepository } from "../infrastructure/location-prices.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { withoutPrices } from "../domain/price-visibility";
import type { ProductRow } from "../infrastructure/tables/products.table";

/** Builds the `Product` of the contract: the row plus packs, barcodes, location prices, names. */
@Injectable()
export class ProductView {
  constructor(
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly locationPrices: LocationPricesRepository,
    private readonly members: MembersService,
    private readonly business: BusinessDirectory,
  ) {}

  /**
   * The ONE place that decides who sees selling prices: a storekeeper without `set_prices`,
   * when the owner switched "hide prices from storekeepers" on. Every product that leaves the
   * API goes through `many`/`one`, so no endpoint can forget it.
   */
  private async hidesPrices(viewer: TenantAccessContext): Promise<boolean> {
    if (viewer.role !== "storekeeper" || hasPermission(viewer, "set_prices")) return false;
    return (await this.business.get(viewer.tenantId))?.hidePricesFromStorekeepers ?? false;
  }

  async many(
    viewer: TenantAccessContext,
    rows: ProductRow[],
    within?: TenantTx,
  ): Promise<Product[]> {
    if (rows.length === 0) return [];
    const { tenantId } = viewer;
    const hide = await this.hidesPrices(viewer);
    const ids = rows.map((r) => r.id);
    const [packs, barcodes, prices, names] = await Promise.all([
      this.packs.forProducts(tenantId, ids, within),
      this.barcodes.forProducts(tenantId, ids, within),
      this.locationPrices.forProducts(tenantId, ids, within),
      this.members.namesOf(
        rows.map((r) => r.addedByUserId),
        within,
      ),
    ]);
    const by = <T extends { productId: string }>(list: T[], id: string) =>
      list.filter((x) => x.productId === id);
    const products = rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      brand: r.brand,
      model: r.model,
      storage: r.storage,
      colour: r.colour,
      condition: r.condition,
      trackingType: r.trackingType,
      baseUnit: r.baseUnit,
      packUnits: by(packs, r.id).map((p) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        wholesalePrice: p.wholesalePrice,
        retailPrice: p.retailPrice,
        active: p.active,
      })),
      barcodes: by(barcodes, r.id).map((b) => ({
        id: b.id,
        value: b.value,
        kind: b.kind,
        packUnitId: b.packUnitId,
        active: b.active,
      })),
      retailPrice: r.retailPrice,
      wholesalePrice: r.wholesalePrice,
      minPrice: r.minPrice,
      locationPrices: by(prices, r.id)
        .filter((p) => p.retailPrice !== null || p.wholesalePrice !== null)
        .map((p) => ({
          locationId: p.locationId,
          retailPrice: p.retailPrice,
          wholesalePrice: p.wholesalePrice,
        })),
      vatType: r.vatType,
      canBeGivenFree: r.canBeGivenFree,
      warrantyMonths: r.warrantyMonths,
      status: r.status,
      mergedIntoId: r.mergedIntoId,
      addedBy: { id: r.addedByUserId, name: names.get(r.addedByUserId) ?? "" },
      createdAt: r.createdAt.toISOString(),
    }));
    return hide ? products.map(withoutPrices) : products;
  }

  async one(viewer: TenantAccessContext, row: ProductRow, within?: TenantTx): Promise<Product> {
    return (await this.many(viewer, [row], within))[0]!;
  }
}
