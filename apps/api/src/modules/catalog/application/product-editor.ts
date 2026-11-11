import { Injectable } from "@nestjs/common";
import { buildProductName, cleanText, type updateProductRequestSchema } from "@books/shared";
import type { z } from "zod";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import type { Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { inScope, locationScopeOf } from "../../locations/domain/location-scope";
import { CatalogErrors } from "../domain/catalog-errors";
import { diffDrafts, touchesPrices, type FieldChange } from "../domain/product-changes";
import {
  canonicalCondition,
  cleanOptional,
  fieldsOf,
  missingPartsFields,
  withKeys,
} from "../domain/product-draft";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { LocationPricesRepository } from "../infrastructure/location-prices.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import type { ProductRow } from "../infrastructure/tables/products.table";
import { hasPermission, notAllowed } from "./access";
import { dedupeLocationPrices } from "./create-product.use-case";
import { ProductChecks } from "./product-checks";
import { ProductUsageProbe, isInUse } from "./product-usage-probe";
import { ProductView } from "./product-view";

export type UpdateInput = z.output<typeof updateProductRequestSchema>;
const PARTS = ["brand", "model", "storage", "colour", "condition"] as const;

/**
 * The rules for changing an existing product, shared by `PATCH /products/:id` and approve
 * (which may fix things first). Runs inside the caller's transaction on a locked row and
 * writes the product, its location prices and one history row per changed field.
 */
@Injectable()
export class ProductEditor {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly locationPrices: LocationPricesRepository,
    private readonly history: HistoryRepository,
    private readonly checks: ProductChecks,
    private readonly probe: ProductUsageProbe,
    private readonly locations: LocationsService,
    private readonly view: ProductView,
  ) {}

  async apply(
    actor: Actor,
    t: TenantTx,
    current: ProductRow,
    patch: UpdateInput,
    vatEnabled: boolean,
  ): Promise<{ changes: FieldChange[] }> {
    const { access } = actor;
    if (touchesPrices(patch, true) && !hasPermission(access, "set_prices")) throw notAllowed();

    const categoryChanged =
      patch.categoryId !== undefined && patch.categoryId !== current.categoryId;
    const category = await this.categories.findById(
      t.tenantId,
      patch.categoryId ?? current.categoryId,
      t,
    );
    if (!category || (categoryChanged && category.hidden)) {
      throw CatalogErrors.categoryNotFound(categoryChanged ? 400 : 404);
    }
    const mode = category.namingMode;

    const parts = {
      brand: patch.brand !== undefined ? cleanOptional(patch.brand) : current.brand,
      model: patch.model !== undefined ? cleanOptional(patch.model) : current.model,
      storage: patch.storage !== undefined ? cleanOptional(patch.storage) : current.storage,
      colour: patch.colour !== undefined ? cleanOptional(patch.colour) : current.colour,
      condition:
        patch.condition !== undefined
          ? canonicalCondition(cleanOptional(patch.condition))
          : current.condition,
    };
    const missing = missingPartsFields(mode, parts)[0];
    if (missing) throw CatalogErrors.fieldRequired(missing);
    const partsChanged = PARTS.some((k) => parts[k] !== current[k]);
    // Names can be corrected by hand; otherwise a "parts" name follows its parts (F01 §6).
    let name = current.name;
    if (patch.name !== undefined) name = cleanText(patch.name);
    else if (mode === "parts" && (partsChanged || categoryChanged)) name = buildProductName(parts);

    const trackingType = patch.trackingType ?? current.trackingType;
    const baseUnit = patch.baseUnit !== undefined ? cleanText(patch.baseUnit) : current.baseUnit;
    await this.assertLocksAllow(t, current, trackingType, baseUnit);

    const before = withKeys(mode, fieldsOf(current));
    const draft = withKeys(mode, {
      ...parts,
      name,
      categoryId: category.id,
      trackingType,
      baseUnit,
      retailPrice: patch.retailPrice !== undefined ? patch.retailPrice : current.retailPrice,
      wholesalePrice:
        patch.wholesalePrice !== undefined ? patch.wholesalePrice : current.wholesalePrice,
      minPrice: patch.minPrice !== undefined ? patch.minPrice : current.minPrice,
      // The VAT type is kept only while the business charges VAT (G3).
      vatType: vatEnabled && patch.vatType !== undefined ? patch.vatType : current.vatType,
      canBeGivenFree: patch.canBeGivenFree ?? current.canBeGivenFree,
      warrantyMonths:
        patch.warrantyMonths !== undefined ? patch.warrantyMonths : current.warrantyMonths,
    });

    const acknowledged = await this.checkIdentity(t, current, draft, mode, patch, categoryChanged);
    const changes = diffDrafts(before, draft);
    const priceChange = await this.applyLocationPrices(actor, t, current.id, patch);
    if (priceChange) changes.push(priceChange);

    if (changes.some((c) => c.field !== "locationPrices")) {
      await this.products.updateById(
        t.tenantId,
        current.id,
        {
          name: draft.name,
          nameKey: draft.nameKey,
          categoryId: draft.categoryId,
          brand: draft.brand,
          model: draft.model,
          storage: draft.storage,
          colour: draft.colour,
          condition: draft.condition,
          trackingType: draft.trackingType,
          baseUnit: draft.baseUnit,
          retailPrice: draft.retailPrice,
          wholesalePrice: draft.wholesalePrice,
          minPrice: draft.minPrice,
          vatType: draft.vatType,
          canBeGivenFree: draft.canBeGivenFree,
          warrantyMonths: draft.warrantyMonths,
          duplicateKey: draft.duplicateKey,
          conditionFamilyKey: draft.conditionFamilyKey,
          modelGroupKey: draft.modelGroupKey,
        },
        t,
      );
    }
    await this.history.add(
      t.tenantId,
      current.id,
      access.userId,
      [
        ...changes.map((c) => ({ action: "updated", ...c })),
        ...(acknowledged.length > 0
          ? [{ action: "similar_acknowledged", after: { products: acknowledged } }]
          : []),
      ],
      t,
    );
    return { changes };
  }

  /** Tracking type and base unit are fixed once there is stock or sales (F01 §10). */
  private async assertLocksAllow(
    t: TenantTx,
    current: ProductRow,
    trackingType: string,
    baseUnit: string,
  ): Promise<void> {
    if (trackingType === current.trackingType && baseUnit === current.baseUnit) return;
    const usage = await this.probe.usageOf(t.tenantId, current.id);
    if (isInUse(usage)) throw CatalogErrors.productInUse(usage);
    if (trackingType !== "quantity" && trackingType !== current.trackingType) {
      const packs = await this.packs.activeForProduct(t.tenantId, current.id, t);
      if (packs.length > 0) throw CatalogErrors.packsNotAllowed();
    }
  }

  /** Duplicate, barcode and similar checks when the product's identity changes. */
  private async checkIdentity(
    t: TenantTx,
    current: ProductRow,
    draft: ReturnType<typeof withKeys>,
    mode: "parts" | "free",
    patch: UpdateInput,
    categoryChanged: boolean,
  ): Promise<{ id: string; name: string }[]> {
    const identityChanged =
      categoryChanged || draft.name !== current.name || PARTS.some((k) => draft[k] !== current[k]);
    if (!identityChanged) return [];
    const held = (await this.barcodes.activeForProduct(t.tenantId, current.id, t))
      .filter((b) => b.kind === "manufacturer")
      .map((b) => b.value);
    await this.barcodes.lockValues(t.tenantId, held, t);
    const found = await this.checks.run(t, draft, mode, held, current.id);
    if (found.exact) throw CatalogErrors.duplicateProduct(found.exact.id, found.exact.name);
    const clash = found.clashes[0];
    if (clash)
      throw CatalogErrors.barcodeInUse(clash.barcode, clash.product.id, clash.product.name);
    if (found.similar.length > 0 && !patch.acknowledgeSimilar) {
      throw CatalogErrors.similarProducts(await this.view.many(t.tenantId, found.similar, t));
    }
    return patch.acknowledgeSimilar ? found.similar.map((s) => ({ id: s.id, name: s.name })) : [];
  }

  private async applyLocationPrices(
    actor: Actor,
    t: TenantTx,
    productId: string,
    patch: UpdateInput,
  ): Promise<FieldChange | null> {
    if (patch.locationPrices === undefined) return null;
    const wanted = dedupeLocationPrices(patch.locationPrices).filter(
      (p) => p.retailPrice !== null || p.wholesalePrice !== null,
    );
    const scope = locationScopeOf(actor.access);
    await this.locations.assertUsable(
      t.tenantId,
      wanted.map((p) => p.locationId),
      scope,
      t,
    );
    // Prices of locations outside the caller's scope are not theirs to see or clear.
    const existing = (await this.locationPrices.forProducts(t.tenantId, [productId], t))
      .filter((p) => inScope(scope, p.locationId))
      .filter((p) => p.retailPrice !== null || p.wholesalePrice !== null)
      .map((p) => ({
        locationId: p.locationId,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
      }));
    const order = (list: typeof wanted) =>
      JSON.stringify([...list].sort((a, b) => a.locationId.localeCompare(b.locationId)));
    if (order(existing) === order(wanted)) return null;
    await this.locationPrices.replace(t.tenantId, productId, wanted, t, scope);
    return { field: "locationPrices", before: existing, after: wanted };
  }
}
