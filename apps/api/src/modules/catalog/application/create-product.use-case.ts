import { Injectable } from "@nestjs/common";
import { isApprover, type ProductResponse, type createProductRequestSchema } from "@books/shared";
import type { z } from "zod";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { BusinessDirectory } from "../../identity/application/business-directory";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { locationScopeOf } from "../../locations/domain/location-scope";
import { checkBarcodeValue } from "../domain/barcode-rules";
import { CatalogErrors } from "../domain/catalog-errors";
import { touchesPrices } from "../domain/product-changes";
import { draftFromCreate, type ProductDraft } from "../domain/product-draft";
import { BarcodesRepository } from "../infrastructure/barcodes.repository";
import { CategoriesRepository } from "../infrastructure/categories.repository";
import { HistoryRepository } from "../infrastructure/history.repository";
import { LocationPricesRepository } from "../infrastructure/location-prices.repository";
import { PackUnitsRepository } from "../infrastructure/pack-units.repository";
import { ProductsRepository } from "../infrastructure/products.repository";
import { assertPermission, hasPermission, notAllowed } from "./access";
import { ProductChecks } from "./product-checks";
import { ProductConflicts } from "./product-conflicts";
import { ProductView } from "./product-view";

/** `bulk` is never sent by a client on a single create; the bulk use case sets it. */
export type CreateProductInput = Omit<z.output<typeof createProductRequestSchema>, "source"> & {
  source: "form" | "quick_add" | "bulk";
};

/** Validates every typed barcode (digits/letters, no IMEI) and removes repeats. */
export function cleanBarcodes(values: string[]): string[] {
  const cleaned = values.map((raw) => {
    const check = checkBarcodeValue(raw);
    if (!check.ok) throw CatalogErrors.invalidBarcode(check.reason);
    return check.value;
  });
  return [...new Set(cleaned)];
}

/**
 * `POST /products` (add_products). Status is `active` for approvers and `waiting` for
 * everyone else (F01 §8, G1). Refused, in this order: exact duplicate, barcode clash,
 * similar products (unless acknowledged). Prices need `set_prices`.
 */
@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly categories: CategoriesRepository,
    private readonly products: ProductsRepository,
    private readonly packs: PackUnitsRepository,
    private readonly barcodes: BarcodesRepository,
    private readonly locationPrices: LocationPricesRepository,
    private readonly history: HistoryRepository,
    private readonly checks: ProductChecks,
    private readonly conflicts: ProductConflicts,
    private readonly locations: LocationsService,
    private readonly business: BusinessDirectory,
    private readonly view: ProductView,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: CreateProductInput): Promise<ProductResponse> {
    const { access } = actor;
    assertPermission(access, "add_products");
    if (touchesPrices(input, false) && !hasPermission(access, "set_prices")) throw notAllowed();
    const vatEnabled = (await this.business.get(access.tenantId))?.vatEnabled ?? false;
    const barcodes = cleanBarcodes(input.barcodes);
    const seen: { draft?: ProductDraft } = {};

    let created;
    try {
      created = await this.tenantDb.transaction(access.tenantId, (t) =>
        this.create(actor, t, input, barcodes, vatEnabled, seen),
      );
    } catch (err) {
      const mapped = await this.conflicts.translate(err, {
        tenantId: access.tenantId,
        duplicateKey: seen.draft?.duplicateKey,
        barcodes,
      });
      throw mapped ?? err;
    }
    await this.audit.record({
      ...auditBase(actor),
      action: "product_created",
      targetId: created.product.id,
      details: {
        after: {
          name: created.product.name,
          status: created.product.status,
          source: input.source,
          locationId: input.locationId ?? null,
          barcodes,
        },
        acknowledgedSimilar: created.acknowledged,
      },
    });
    return { product: created.product };
  }

  private async create(
    actor: Actor,
    t: TenantTx,
    input: CreateProductInput,
    barcodes: string[],
    vatEnabled: boolean,
    seen: { draft?: ProductDraft },
  ) {
    const { access } = actor;
    const category = await this.categories.lockById(t.tenantId, input.categoryId, "share", t);
    if (!category || category.hidden) throw CatalogErrors.categoryNotFound(400);
    const draft = draftFromCreate(category, input, vatEnabled);
    seen.draft = draft;

    const status = isApprover(access.role, access.permissionOverrides) ? "active" : "waiting";
    // Anyone who can set prices must: a product without a price cannot be sold (F01 §4).
    if (status === "active" && hasPermission(access, "set_prices") && draft.retailPrice === null) {
      throw CatalogErrors.fieldRequired("retailPrice", "price_required");
    }
    if (draft.trackingType !== "quantity" && input.packUnits.length > 0) {
      throw CatalogErrors.packsNotAllowed();
    }
    const packNames = new Set(input.packUnits.map((p) => p.name.toLowerCase()));
    if (packNames.size !== input.packUnits.length) throw CatalogErrors.packExists();
    const wantedPrices = dedupeLocationPrices(input.locationPrices);
    // The shop the person is working in is checked like any other location they use.
    await this.locations.assertUsable(
      t.tenantId,
      [...wantedPrices.map((p) => p.locationId), ...(input.locationId ? [input.locationId] : [])],
      locationScopeOf(access),
      t,
    );

    await this.barcodes.lockValues(t.tenantId, barcodes, t);
    const found = await this.checks.run(t, draft, category.namingMode, barcodes);
    if (found.exact) throw CatalogErrors.duplicateProduct(found.exact.id, found.exact.name);
    const clash = found.clashes[0];
    if (clash)
      throw CatalogErrors.barcodeInUse(clash.barcode, clash.product.id, clash.product.name);
    if (found.similar.length > 0 && !input.acknowledgeSimilar) {
      throw CatalogErrors.similarProducts(await this.view.many(actor.access, found.similar, t));
    }

    const row = await this.products.create(
      t.tenantId,
      {
        categoryId: draft.categoryId,
        name: draft.name,
        nameKey: draft.nameKey,
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
        status,
        duplicateKey: draft.duplicateKey,
        conditionFamilyKey: draft.conditionFamilyKey,
        modelGroupKey: draft.modelGroupKey,
        addedByUserId: access.userId,
        source: input.source,
      },
      t,
    );
    for (const pack of input.packUnits) {
      await this.packs.create(
        t.tenantId,
        {
          productId: row.id,
          name: pack.name,
          size: pack.size,
          wholesalePrice: pack.wholesalePrice ?? null,
          retailPrice: pack.retailPrice ?? null,
        },
        t,
      );
    }
    for (const value of barcodes) {
      await this.barcodes.create(t.tenantId, { productId: row.id, value, kind: "manufacturer" }, t);
    }
    if (wantedPrices.length > 0) {
      await this.locationPrices.replace(t.tenantId, row.id, wantedPrices, t, null);
    }
    const acknowledged = input.acknowledgeSimilar ? found.similar.map((s) => s.id) : [];
    await this.history.add(
      t.tenantId,
      row.id,
      access.userId,
      [
        {
          action: "created",
          after: {
            name: row.name,
            status,
            source: input.source,
            locationId: input.locationId ?? null,
          },
        },
        ...(acknowledged.length > 0
          ? [
              {
                action: "similar_acknowledged",
                after: { products: found.similar.map((s) => ({ id: s.id, name: s.name })) },
              },
            ]
          : []),
      ],
      t,
    );
    return { product: await this.view.one(actor.access, row, t), acknowledged };
  }
}

/** One entry per location (the last one wins), prices defaulted to null. */
export function dedupeLocationPrices(
  list: { locationId: string; retailPrice?: number | null; wholesalePrice?: number | null }[],
) {
  const byLocation = new Map(
    list.map((p) => [
      p.locationId,
      {
        locationId: p.locationId,
        retailPrice: p.retailPrice ?? null,
        wholesalePrice: p.wholesalePrice ?? null,
      },
    ]),
  );
  return [...byLocation.values()];
}
