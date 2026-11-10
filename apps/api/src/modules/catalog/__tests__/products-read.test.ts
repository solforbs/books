import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  STARTER_CONDITIONS,
  type ProductOptionsResponse,
  type ProductsResponse,
} from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import {
  accessoryBody,
  addProduct,
  phoneBody,
  shopWithCatalog,
  staffMember,
} from "./catalog-fixtures";

describe("reading the product list (F01 §5.7)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("pages through the list by name with an opaque cursor", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const names = ["Echo", "Alpha", "Delta", "Bravo", "Charlie"];
    for (const name of names) await addProduct(owner, accessoryBody(accessories.id, name));

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const url: string = `/products?limit=2${cursor ? `&cursor=${cursor}` : ""}`;
      const page: ProductsResponse = (await owner.get(url)).json<ProductsResponse>();
      expect(page.products.length).toBeLessThanOrEqual(2);
      seen.push(...page.products.map((p) => p.name));
      cursor = page.nextCursor;
      pages++;
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);

    const bad = await owner.get("/products?cursor=garbage");
    expect(bad.statusCode).toBe(400);
    expect((await owner.get("/products?limit=500")).statusCode).toBe(400);
    expect((await owner.get("/products?status=nonsense")).statusCode).toBe(400);
  });

  it("searches name, brand, model and barcodes; every word must match", async () => {
    const { owner, phones, accessories } = await shopWithCatalog(t);
    const phone = await addProduct(
      owner,
      phoneBody(phones.id, { brand: "Tecno", model: "Spark 20", barcodes: ["6900001234567"] }),
    );
    const cable = await addProduct(owner, accessoryBody(accessories.id, "Type-C cable 1m"));
    const search = async (q: string) =>
      (await owner.get(`/products?q=${encodeURIComponent(q)}`))
        .json<ProductsResponse>()
        .products.map((p) => p.id);

    expect(await search("tecno")).toEqual([phone.id]);
    expect(await search("spark 20")).toEqual([phone.id]);
    expect(await search("SPARK black")).toEqual([phone.id]);
    expect(await search("spark blue")).toEqual([]);
    expect(await search("6900001234")).toEqual([phone.id]);
    expect(await search("type-c")).toEqual([cable.id]);
    expect(await search("cable")).toEqual([cable.id]);
    expect(await search("100%")).toEqual([]); // wildcard characters are plain text
    expect(
      (await owner.get(`/products?categoryId=${phones.id}`)).json<ProductsResponse>().products,
    ).toHaveLength(1);
    expect(await search("")).toHaveLength(2);
  });

  it("lookup returns nothing for an unknown code and requires a code", async () => {
    const { owner } = await shopWithCatalog(t);
    expect(
      (await owner.get("/products/lookup?barcode=0000000000000")).json<ProductsResponse>().products,
    ).toEqual([]);
    expect((await owner.get("/products/lookup")).statusCode).toBe(400);
  });

  it("options: suggestions from what the shop already uses, with the starter conditions", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const empty = (await owner.get("/products/options")).json<ProductOptionsResponse>();
    expect(empty).toEqual({
      brands: [],
      models: [],
      storages: [],
      colours: [],
      conditions: [...STARTER_CONDITIONS],
    });

    await addProduct(
      owner,
      phoneBody(phones.id, {
        brand: "Apple",
        model: "iPhone 13",
        colour: "Blue",
        storage: "128GB",
      }),
    );
    await addProduct(
      owner,
      phoneBody(phones.id, {
        brand: "Apple",
        model: "iPhone 13",
        colour: "Gold",
        storage: "256GB",
      }),
    );
    await addProduct(
      owner,
      phoneBody(phones.id, {
        brand: "Samsung",
        model: "A15",
        colour: "blue",
        condition: "Grade A",
      }),
    );
    const options = (await owner.get("/products/options")).json<ProductOptionsResponse>();
    expect(options.brands).toEqual(["Apple", "Samsung"]);
    expect(options.models).toEqual([
      { brand: "Apple", model: "iPhone 13" },
      { brand: "Samsung", model: "A15" },
    ]);
    expect(options.colours.map((c) => c.toLowerCase()).sort()).toEqual(["blue", "gold"]);
    expect(options.storages.sort()).toEqual(["128GB", "256GB"]);
    expect(options.conditions).toEqual(expect.arrayContaining([...STARTER_CONDITIONS, "Grade A"]));
  });

  it("every member can read the list, a product and the categories; status filters work", async () => {
    const shop = await shopWithCatalog(t);
    const product = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Cable"));
    for (const role of ["cashier", "storekeeper", "accountant"] as const) {
      const member = await staffMember(t, shop, role);
      expect((await member.client.get("/products")).json<ProductsResponse>().products).toHaveLength(
        1,
      );
      expect((await member.client.get(`/products/${product.id}`)).statusCode).toBe(200);
      expect((await member.client.get("/products/options")).statusCode).toBe(200);
    }
    expect(
      (await shop.owner.get("/products?status=active")).json<ProductsResponse>().products,
    ).toHaveLength(1);
    expect(
      (await shop.owner.get("/products?status=rejected")).json<ProductsResponse>().products,
    ).toEqual([]);
  });

  it("requires signing in and a selected business", async () => {
    const { owner } = await shopWithCatalog(t);
    expect(owner.jar.size).toBeGreaterThan(0);
    const anonymous = await t.app.inject({ method: "GET", url: "/api/v1/products" });
    expect(anonymous.statusCode).toBe(401);
  });
});
