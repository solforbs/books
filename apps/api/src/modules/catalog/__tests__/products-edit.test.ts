import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Product, ProductHistoryResponse, ProductsResponse } from "@books/shared";
import { createLocation, expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { ProductUsageProbe } from "../application/product-usage-probe";
import {
  accessoryBody,
  addProduct,
  phoneBody,
  shopWithCatalog,
  staffMember,
} from "./catalog-fixtures";

describe("editing, hiding and history (F01 §10)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const history = async (
    client: { get: (u: string) => Promise<{ json: <T>() => T }> },
    id: string,
  ) => (await client.get(`/products/${id}/history`)).json<ProductHistoryResponse>().entries;

  it("updates only what is sent, rebuilds a phone's name from its parts, and records who changed what", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const phone = await addProduct(owner, phoneBody(phones.id));
    const res = expectStatus(
      await owner.patch(`/products/${phone.id}`, {
        colour: "Blue",
        retailPrice: 1_900_000,
        warrantyMonths: 12,
      }),
      200,
    ).json<{ product: Product }>().product;
    expect(res).toMatchObject({
      name: "Samsung A15 128GB Blue New",
      colour: "Blue",
      retailPrice: 1_900_000,
      warrantyMonths: 12,
      storage: "128GB",
    });
    const entries = await history(owner, phone.id);
    const changed = entries.filter((e) => e.action === "updated");
    expect(changed.map((e) => e.field).sort()).toEqual([
      "colour",
      "name",
      "retailPrice",
      "warrantyMonths",
    ]);
    expect(changed.find((e) => e.field === "retailPrice")).toMatchObject({
      before: 1_800_000,
      after: 1_900_000,
      by: { name: "Amina Hassan" },
    });
    expect(entries.at(-1)).toMatchObject({ action: "created" });
    expect((await owner.patch(`/products/${phone.id}`, {})).statusCode).toBe(400);
  });

  it("a typed name can be corrected; changing to an existing product is refused", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const a = await addProduct(owner, accessoryBody(accessories.id, "Phone stnd"));
    await addProduct(owner, accessoryBody(accessories.id, "Phone stand"));
    const dup = await owner.patch(`/products/${a.id}`, { name: "phone  STAND" });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe("duplicate_product");
    const ok = await owner.patch(`/products/${a.id}`, { name: "Phone holder" });
    expect(ok.json().product.name).toBe("Phone holder");
    // The same product keeps its own name when re-saved.
    expectStatus(
      await owner.patch(`/products/${a.id}`, { name: "Phone holder", retailPrice: 5 }),
      200,
    );
  });

  it("price fields need set_prices; other fields do not", async () => {
    const shop = await shopWithCatalog(t);
    const product = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Cable"));
    const manager = await staffMember(t, shop, "manager", { set_prices: false });
    for (const body of [
      { retailPrice: 1 },
      { wholesalePrice: null },
      { minPrice: 5 },
      { locationPrices: [] },
    ]) {
      const res = await manager.client.patch(`/products/${product.id}`, body);
      expect(res.statusCode, JSON.stringify(body)).toBe(403);
      expect(res.json().error.code).toBe("forbidden");
    }
    const ok = await manager.client.patch(`/products/${product.id}`, { warrantyMonths: 6 });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().product.retailPrice).toBe(150_000);
    // The price history is hidden from people who may not set prices.
    await shop.owner.patch(`/products/${product.id}`, { retailPrice: 160_000 });
    const mine = await history(manager.client, product.id);
    expect(mine.some((e) => e.field === "retailPrice")).toBe(false);
    expect(mine.some((e) => e.field === "warrantyMonths")).toBe(true);
    expect((await history(shop.owner, product.id)).some((e) => e.field === "retailPrice")).toBe(
      true,
    );
  });

  it("a cashier cannot edit, hide or read the history", async () => {
    const shop = await shopWithCatalog(t);
    const product = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Cable"));
    const cashier = await staffMember(t, shop, "cashier");
    expect(
      (await cashier.client.patch(`/products/${product.id}`, { name: "Hacked" })).statusCode,
    ).toBe(403);
    expect((await cashier.client.post(`/products/${product.id}/hide`)).statusCode).toBe(403);
    expect((await cashier.client.post(`/products/${product.id}/unhide`)).statusCode).toBe(403);
    expect((await cashier.client.get(`/products/${product.id}/history`)).statusCode).toBe(403);
    expect((await cashier.client.get(`/products/${product.id}`)).statusCode).toBe(200);
  });

  it("per-location prices: set, replace, clear; only open locations of the business", async () => {
    const shop = await shopWithCatalog(t);
    const second = await createLocation(shop.owner, { name: "Shop 2", type: "shop" });
    const product = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Cable"));
    const set = await shop.owner.patch(`/products/${product.id}`, {
      locationPrices: [
        { locationId: second.id, retailPrice: 170_000 },
        { locationId: shop.shop.id, retailPrice: 160_000, wholesalePrice: 140_000 },
      ],
    });
    expect(set.json().product.locationPrices).toHaveLength(2);
    const cleared = await shop.owner.patch(`/products/${product.id}`, {
      locationPrices: [{ locationId: second.id, retailPrice: 175_000 }],
    });
    expect(cleared.json().product.locationPrices).toEqual([
      { locationId: second.id, retailPrice: 175_000, wholesalePrice: null },
    ]);
    const unknown = await shop.owner.patch(`/products/${product.id}`, {
      locationPrices: [{ locationId: "00000000-0000-4000-8000-000000000000", retailPrice: 1 }],
    });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().error.code).toBe("location_not_found");
    const entries = await history(shop.owner, product.id);
    expect(entries.filter((e) => e.field === "locationPrices")).toHaveLength(2);
  });

  it("T9: tracking type and base unit are fixed once the product has stock or sales", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const phone = await addProduct(owner, phoneBody(phones.id));
    const probe = t.app.get(ProductUsageProbe);
    const spy = vi.spyOn(probe, "usageOf").mockResolvedValue({ stockQuantity: 5, saleCount: 0 });
    try {
      for (const body of [{ trackingType: "quantity" }, { baseUnit: "box" }]) {
        const res = await owner.patch(`/products/${phone.id}`, body);
        expect(res.statusCode).toBe(409);
        expect(res.json().error).toMatchObject({
          code: "product_in_use",
          details: { stockQuantity: 5, saleCount: 0 },
        });
      }
      // Changing other things is still fine, and sending the same value is not a change.
      expectStatus(
        await owner.patch(`/products/${phone.id}`, {
          trackingType: "imei",
          retailPrice: 2_000_000,
        }),
        200,
      );
    } finally {
      spy.mockRestore();
    }
    const free = await owner.patch(`/products/${phone.id}`, { trackingType: "serial" });
    expect(free.json().product.trackingType).toBe("serial");
  });

  it("an IMEI product cannot be switched to a type with packs, nor a pack product to IMEI", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const cable = await addProduct(owner, accessoryBody(accessories.id, "Earphones"));
    await owner.post(`/products/${cable.id}/packs`, { name: "Box", size: 10 });
    const res = await owner.patch(`/products/${cable.id}`, { trackingType: "imei" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("packs_not_allowed");
  });

  it("hides and unhides: hidden products leave the list and scans but stay readable", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(
      owner,
      accessoryBody(accessories.id, "Cable", { barcodes: ["9990001112223"] }),
    );
    const hidden = expectStatus(await owner.post(`/products/${product.id}/hide`), 200).json<{
      product: Product;
    }>();
    expect(hidden.product.status).toBe("hidden");
    expect((await owner.post(`/products/${product.id}/hide`)).statusCode).toBe(200); // no-op
    expect((await owner.get("/products")).json<ProductsResponse>().products).toEqual([]);
    expect(
      (await owner.get("/products?status=hidden")).json<ProductsResponse>().products,
    ).toHaveLength(1);
    expect(
      (await owner.get("/products/lookup?barcode=9990001112223")).json<ProductsResponse>().products,
    ).toEqual([]);
    expect((await owner.get(`/products/${product.id}`)).json().product.status).toBe("hidden");
    // Its name stays taken while it is only hidden.
    expect((await owner.post("/products", accessoryBody(accessories.id, "Cable"))).statusCode).toBe(
      409,
    );

    const back = expectStatus(await owner.post(`/products/${product.id}/unhide`), 200).json<{
      product: Product;
    }>();
    expect(back.product.status).toBe("active");
    expect((await owner.post(`/products/${product.id}/unhide`)).statusCode).toBe(200); // no-op
    const actions = (await history(owner, product.id)).map((e) => e.action);
    expect(actions).toEqual(["unhidden", "hidden", "created"]);
  });

  it("refuses to hide a product that still has stock (product_has_stock)", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, accessoryBody(accessories.id, "Cable"));
    const spy = vi
      .spyOn(t.app.get(ProductUsageProbe), "usageOf")
      .mockResolvedValue({ stockQuantity: 15, saleCount: 3 });
    try {
      const res = await owner.post(`/products/${product.id}/hide`);
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatchObject({
        code: "product_has_stock",
        details: { stockQuantity: 15 },
      });
    } finally {
      spy.mockRestore();
    }
    expect((await owner.get(`/products/${product.id}`)).json().product.status).toBe("active");
  });

  it("a waiting product that is hidden returns to waiting; merged and rejected ones cannot be edited", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await addProduct(cashier.client, {
      categoryId: shop.accessories.id,
      name: "Mystery",
    });
    await shop.owner.post(`/products/${waiting.id}/hide`);
    const back = await shop.owner.post(`/products/${waiting.id}/unhide`);
    expect(back.json().product.status).toBe("waiting");
    await shop.owner.post(`/products/${waiting.id}/reject`);
    const res = await shop.owner.patch(`/products/${waiting.id}`, { name: "Again" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("product_closed");
    expect((await shop.owner.post(`/products/${waiting.id}/hide`)).json().error.code).toBe(
      "product_closed",
    );
  });

  it("answers 404 product_not_found for unknown or malformed ids", async () => {
    const { owner } = await shopWithCatalog(t);
    for (const id of ["not-an-id", "00000000-0000-4000-8000-000000000000"]) {
      for (const res of [
        await owner.get(`/products/${id}`),
        await owner.patch(`/products/${id}`, { name: "x" }),
        await owner.post(`/products/${id}/hide`),
        await owner.get(`/products/${id}/history`),
      ]) {
        expect(res.statusCode).toBe(404);
        expect(res.json().error.code).toBe("product_not_found");
      }
    }
  });
});
