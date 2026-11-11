import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  BulkCreateResponse,
  Product,
  ProductHistoryResponse,
  ProductsResponse,
} from "@books/shared";
import { createLocation, expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, shopWithCatalog, staffMember } from "./catalog-fixtures";

/** Regression tests for the S1b security review (approve fixes, scope, cursor, source). */
describe("S1b review fixes: request validation", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const quickAdd = (categoryId: string, name: string) =>
    accessoryBody(categoryId, name, { source: "quick_add", retailPrice: undefined });

  it("approve refuses invalid or unknown fixes instead of silently dropping them", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const product = await addProduct(cashier.client, quickAdd(shop.accessories.id, "Tripod 1m"));

    for (const body of [
      { name: "Fixed", retailPrice: -5 },
      { colour: "Red", nonsense: 1 },
    ]) {
      const res = await shop.owner.post(`/products/${product.id}/approve`, body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
    }
    const still = (await shop.owner.get(`/products/${product.id}`)).json<{ product: Product }>();
    expect(still.product).toMatchObject({ status: "waiting", name: "Tripod 1m" });

    const ok = expectStatus(
      await shop.owner.post(`/products/${product.id}/approve`, {
        name: "Fixed",
        retailPrice: 5_000,
      }),
      200,
    ).json<{ product: Product }>();
    expect(ok.product).toMatchObject({ status: "active", name: "Fixed", retailPrice: 5_000 });
  });

  it("an empty approve body is a plain approve", async () => {
    const shop = await shopWithCatalog(t);
    const priced = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Cable 2m", { retailPrice: 30_000 }),
    );
    await t.tenantSql(shop.tenantId, "update products set status = 'waiting' where id = $1", [
      priced.id,
    ]);
    const res = expectStatus(await shop.owner.post(`/products/${priced.id}/approve`, {}), 200);
    expect(res.json<{ product: Product }>().product.status).toBe("active");
  });

  it("a tampered cursor with a non-uuid id is a 400 invalid_cursor, not a 500", async () => {
    const { owner } = await shopWithCatalog(t);
    const forged = Buffer.from(JSON.stringify(["alpha", "not-a-uuid"])).toString("base64url");
    for (const path of ["/products", "/products/waiting"]) {
      const res = await owner.get(`${path}?cursor=${forged}`);
      expect(res.statusCode, path).toBe(400);
      expect(res.json().error.code).toBe("invalid_cursor");
    }
    const garbage = await owner.get("/products?cursor=garbage");
    expect(garbage.json().error.code).toBe("invalid_cursor");
  });

  it("a single create accepts only form or quick_add as its source; bulk always records bulk", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    for (const source of ["import", "bulk", "nonsense"]) {
      const res = await cashier.client.post("/products", {
        ...accessoryBody(shop.accessories.id, `Item ${source}`),
        source,
      });
      expect(res.statusCode, source).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
    }
    const quick = await addProduct(cashier.client, quickAdd(shop.accessories.id, "Quick one"));
    const rows = ["import", "form", "quick_add"].map((source, i) => ({
      ...accessoryBody(shop.accessories.id, `Bulk item ${i}`),
      source,
    }));
    const { results } = expectStatus(
      await shop.owner.post("/products/bulk", { items: rows }),
      200,
    ).json<BulkCreateResponse>();
    const sources = async (id: string) =>
      (
        await t.tenantSql<{ source: string }>(
          shop.tenantId,
          "select source from products where id = $1",
          [id],
        )
      )[0]!.source;
    expect(await sources(quick.id)).toBe("quick_add");
    for (const r of results) expect(await sources(r.product!.id)).toBe("bulk");
    const history = (
      await shop.owner.get(`/products/${results[0]!.product!.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(history.entries.find((e) => e.action === "created")?.after).toMatchObject({
      source: "bulk",
    });
  });
});

describe("S1b review fixes: location prices respect the caller's scope", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const pricesOf = async (
    client: Awaited<ReturnType<typeof shopWithCatalog>>["owner"],
    id: string,
  ) =>
    Object.fromEntries(
      (await client.get(`/products/${id}`))
        .json<{ product: Product }>()
        .product.locationPrices.map((p) => [p.locationId, p.retailPrice]),
    );

  it("a manager limited to one shop never clears the prices of another shop", async () => {
    const shop = await shopWithCatalog(t);
    const shopB = await createLocation(shop.owner, { name: "Shop B", type: "shop" });
    const manager = await staffMember(t, shop, "manager");
    const product = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Speaker", {
        locationPrices: [
          { locationId: shop.shop.id, retailPrice: 100_000 },
          { locationId: shopB.id, retailPrice: 200_000 },
        ],
      }),
    );

    expectStatus(
      await manager.client.patch(`/products/${product.id}`, {
        locationPrices: [{ locationId: shop.shop.id, retailPrice: 150_000 }],
      }),
      200,
    );
    expect(await pricesOf(shop.owner, product.id)).toEqual({
      [shop.shop.id]: 150_000,
      [shopB.id]: 200_000,
    });

    // An empty list clears only the manager's own shop (cleared prices are not listed).
    expectStatus(
      await manager.client.patch(`/products/${product.id}`, { locationPrices: [] }),
      200,
    );
    expect(await pricesOf(shop.owner, product.id)).toEqual({
      [shopB.id]: 200_000,
    });
    const history = (
      await shop.owner.get(`/products/${product.id}/history`)
    ).json<ProductHistoryResponse>();
    const entry = history.entries.find((e) => e.field === "locationPrices");
    expect(JSON.stringify(entry?.before)).not.toContain(shopB.id);
  });

  it("an owner (all locations) still clears every location missing from the list", async () => {
    const shop = await shopWithCatalog(t);
    const shopB = await createLocation(shop.owner, { name: "Shop B", type: "shop" });
    const product = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Speaker", {
        locationPrices: [
          { locationId: shop.shop.id, retailPrice: 100_000 },
          { locationId: shopB.id, retailPrice: 200_000 },
        ],
      }),
    );
    expectStatus(
      await shop.owner.patch(`/products/${product.id}`, {
        locationPrices: [{ locationId: shop.shop.id, retailPrice: 110_000 }],
      }),
      200,
    );
    expect(await pricesOf(shop.owner, product.id)).toEqual({
      [shop.shop.id]: 110_000,
    });
    const list = (await shop.owner.get("/products")).json<ProductsResponse>();
    expect(list.products).toHaveLength(1);
  });
});
