import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  BulkCreateResponse,
  CheckProductResponse,
  Product,
  ProductHistoryResponse,
  ProductsResponse,
} from "@books/shared";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import {
  accessoryBody,
  addProduct,
  shopWithCatalog,
  staffMember,
  type Catalog,
} from "./catalog-fixtures";

type Flag = { business: { hidePricesFromStorekeepers: boolean } };

/** Owner switch "hide selling prices from storekeepers" (F01 section 11, founders 2026-11-11). */
describe("hiding selling prices from storekeepers", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const setSwitch = async (shop: Catalog, on: boolean) =>
    expectStatus(
      await shop.owner.put("/business", {
        name: "Shop",
        vatEnabled: false,
        hidePricesFromStorekeepers: on,
      }),
      200,
    ).json<Flag>().business;

  async function setup() {
    const shop = await shopWithCatalog(t);
    const product = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Oraimo charger 20W", {
        retailPrice: 150_000,
        wholesalePrice: 120_000,
        minPrice: 100_000,
        locationPrices: [{ locationId: shop.shop.id, retailPrice: 160_000 }],
        barcodes: ["OR-20W"],
      }),
    );
    await shop.owner.post(`/products/${product.id}/packs`, {
      name: "Carton",
      size: 10,
      wholesalePrice: 1_000_000,
      retailPrice: 1_300_000,
    });
    return { shop, product };
  }

  const noPrices = (p: Product) => {
    expect(p.retailPrice).toBeNull();
    expect(p.wholesalePrice).toBeNull();
    expect(p.minPrice).toBeNull();
    expect(p.locationPrices).toEqual([]);
    for (const pack of p.packUnits) {
      expect(pack.retailPrice).toBeNull();
      expect(pack.wholesalePrice).toBeNull();
    }
  };
  const hasPrices = (p: Product) => {
    expect(p.retailPrice).toBe(150_000);
    expect(p.minPrice).toBe(100_000);
    expect(p.locationPrices).toHaveLength(1);
    expect(p.packUnits[0]!.retailPrice).toBe(1_300_000);
  };

  async function readEverything(client: TestClient, id: string): Promise<Product[]> {
    const one = (await client.get(`/products/${id}`)).json<{ product: Product }>().product;
    const list = (await client.get("/products")).json<ProductsResponse>().products;
    const search = (await client.get("/products?q=or-20w")).json<ProductsResponse>().products;
    const scan = (await client.get("/products/lookup?barcode=or-20w")).json<ProductsResponse>()
      .products;
    expect([list.length, search.length, scan.length]).toEqual([1, 1, 1]);
    return [one, ...list, ...search, ...scan];
  }

  it("is off by default, and only manage_business changes it", async () => {
    const { shop } = await setup();
    const got = (await shop.owner.get("/business")).json<Flag>();
    expect(got.business.hidePricesFromStorekeepers).toBe(false);
    const keeper = await staffMember(t, shop, "storekeeper");
    const denied = await keeper.client.put("/business", {
      name: "Shop",
      vatEnabled: false,
      hidePricesFromStorekeepers: true,
    });
    expect(denied.statusCode).toBe(403);
    expect((await setSwitch(shop, true)).hidePricesFromStorekeepers).toBe(true);
    // Left out = unchanged.
    const kept = (
      await shop.owner.put("/business", { name: "Shop", vatEnabled: false })
    ).json<Flag>();
    expect(kept.business.hidePricesFromStorekeepers).toBe(true);
    // Every member can read the flag.
    const seen = (await keeper.client.get("/business")).json<Flag>();
    expect(seen.business.hidePricesFromStorekeepers).toBe(true);
  });

  it("switch ON: a storekeeper gets no prices from get, list, search and lookup", async () => {
    const { shop, product } = await setup();
    await setSwitch(shop, true);
    const keeper = await staffMember(t, shop, "storekeeper");
    (await readEverything(keeper.client, product.id)).forEach(noPrices);
  });

  it("switch OFF: the storekeeper sees prices; owner, manager and cashier always do", async () => {
    const { shop, product } = await setup();
    const keeper = await staffMember(t, shop, "storekeeper");
    (await readEverything(keeper.client, product.id)).forEach(hasPrices);
    await setSwitch(shop, true);
    const manager = await staffMember(t, shop, "manager");
    const cashier = await staffMember(t, shop, "cashier");
    for (const client of [shop.owner, manager.client, cashier.client]) {
      const p = (await client.get(`/products/${product.id}`)).json<{ product: Product }>().product;
      expect(p.retailPrice).toBe(150_000);
      expect(p.packUnits[0]!.wholesalePrice).toBe(1_000_000);
    }
  });

  it("switch ON: a storekeeper who may set prices still sees them", async () => {
    const { shop, product } = await setup();
    await setSwitch(shop, true);
    const keeper = await staffMember(t, shop, "storekeeper", { set_prices: true });
    const p = (await keeper.client.get(`/products/${product.id}`)).json<{ product: Product }>()
      .product;
    expect(p.retailPrice).toBe(150_000);
  });

  it("switch ON: waiting list, check, create clashes and bulk show no prices", async () => {
    const { shop, product } = await setup();
    await setSwitch(shop, true);
    const approver = await staffMember(t, shop, "storekeeper", { approve_items: true });
    const adder = await staffMember(t, shop, "storekeeper");
    await addProduct(
      adder.client,
      accessoryBody(shop.accessories.id, "Waiting cable", { retailPrice: null }),
    );
    const queue = (await approver.client.get("/products/waiting")).json<ProductsResponse>();
    expect(queue.products).toHaveLength(1);
    queue.products.forEach(noPrices);

    const checked = expectStatus(
      await adder.client.post(
        "/products/check",
        accessoryBody(shop.accessories.id, "Oraimo charger 20W", { barcodes: ["OR-20W"] }),
      ),
      200,
    ).json<CheckProductResponse>();
    noPrices(checked.exactDuplicate!);

    // A similar-name refusal carries the similar products' details.
    const similar = await adder.client.post(
      "/products",
      accessoryBody(shop.accessories.id, "Oraimo 20W charger", { retailPrice: null }),
    );
    expect(similar.statusCode).toBe(409);
    const details = similar.json<{ error: { details: { products: Product[] } } }>().error.details;
    expect(details.products.map((p) => p.id)).toContain(product.id);
    details.products.forEach(noPrices);

    const bulk = expectStatus(
      await adder.client.post("/products/bulk", {
        items: [accessoryBody(shop.accessories.id, "Bulk item one", { retailPrice: null })],
      }),
      200,
    ).json<BulkCreateResponse>();
    const created = bulk.results.map((r) => r.product).filter((p): p is Product => !!p);
    expect(created).toHaveLength(1);
    created.forEach(noPrices);
  });

  it("switch ON: barcode clashes in a check show no prices", async () => {
    const { shop } = await setup();
    await setSwitch(shop, true);
    const adder = await staffMember(t, shop, "storekeeper");
    const checked = expectStatus(
      await adder.client.post(
        "/products/check",
        accessoryBody(shop.accessories.id, "Totally other name", { barcodes: ["or-20w"] }),
      ),
      200,
    ).json<CheckProductResponse>();
    expect(checked.barcodeClashes).toHaveLength(1);
    checked.barcodeClashes.forEach((c) => noPrices(c.product));
  });

  it("switch ON: create, update, hide, pack and barcode responses of a storekeeper with manage_products show no prices", async () => {
    const { shop, product } = await setup();
    await setSwitch(shop, true);
    const keeper = await staffMember(t, shop, "storekeeper", { manage_products: true });
    noPrices(
      await addProduct(
        keeper.client,
        accessoryBody(shop.accessories.id, "Fresh", { retailPrice: null }),
      ),
    );
    const responses = [
      await keeper.client.patch(`/products/${product.id}`, { warrantyMonths: 3 }),
      await keeper.client.post(`/products/${product.id}/hide`, {}),
      await keeper.client.post(`/products/${product.id}/unhide`, {}),
      await keeper.client.post(`/products/${product.id}/barcodes`, { value: "NEW-CODE" }),
      await keeper.client.post(`/products/${product.id}/barcodes/generate`, {}),
      await keeper.client.post(`/products/${product.id}/packs`, { name: "Box", size: 5 }),
    ];
    for (const r of responses) {
      expect(r.statusCode).toBe(200);
      noPrices(r.json<{ product: Product }>().product);
    }
    const detail = (await keeper.client.get(`/products/${product.id}`)).json<{ product: Product }>()
      .product;
    const pack = detail.packUnits.find((p) => p.name === "Carton")!;
    const retired = await keeper.client.post(`/products/${product.id}/packs/${pack.id}/retire`, {});
    noPrices(retired.json<{ product: Product }>().product);
    // The history shows no price entries either.
    const history = (
      await keeper.client.get(`/products/${product.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(JSON.stringify(history)).not.toMatch(/1000000|1300000|retailPrice|wholesalePrice/);
  });

  it("switch ON: merging returns price-free products to a storekeeper approver", async () => {
    const { shop, product } = await setup();
    await setSwitch(shop, true);
    const approver = await staffMember(t, shop, "storekeeper", {
      approve_items: true,
      manage_products: true,
    });
    const adder = await staffMember(t, shop, "cashier");
    const b = await addProduct(
      adder.client,
      accessoryBody(shop.accessories.id, "Waiting two", { retailPrice: null }),
    );
    const merged = await approver.client.post(`/products/${b.id}/merge`, {
      intoProductId: product.id,
    });
    expect(merged.statusCode, merged.body).toBe(200);
    noPrices(merged.json<{ product: Product }>().product);
  });
});
