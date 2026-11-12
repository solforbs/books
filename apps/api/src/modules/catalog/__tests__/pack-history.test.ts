import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Product, ProductHistoryResponse } from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, shopWithCatalog, staffMember } from "./catalog-fixtures";

/** Pack prices are written to the product history (F01 section 10, founders 2026-11-11). */
describe("pack price history", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const entries = (h: ProductHistoryResponse, action: string) =>
    h.entries.filter((e) => e.action === action);

  it("records name, size and prices when a pack is added and when it is retired", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const p = await addProduct(owner, accessoryBody(accessories.id, "Earphones X"));
    const added = await owner.post(`/products/${p.id}/packs`, {
      name: "Carton",
      size: 50,
      wholesalePrice: 400_000,
      retailPrice: 500_000,
    });
    const pack = added.json<{ product: Product }>().product.packUnits[0]!;
    await owner.post(`/products/${p.id}/packs/${pack.id}/retire`, {});

    const history = (await owner.get(`/products/${p.id}/history`)).json<ProductHistoryResponse>();
    const full = { name: "Carton", size: 50, wholesalePrice: 400_000, retailPrice: 500_000 };
    expect(entries(history, "pack_added")[0]).toMatchObject({ field: "pack", after: full });
    expect(entries(history, "pack_retired")[0]).toMatchObject({ field: "pack", before: full });
  });

  it("a pack without prices records null prices", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const p = await addProduct(owner, accessoryBody(accessories.id, "Plain item"));
    await owner.post(`/products/${p.id}/packs`, { name: "Box", size: 6 });
    const history = (await owner.get(`/products/${p.id}/history`)).json<ProductHistoryResponse>();
    expect(entries(history, "pack_added")[0]!.after).toEqual({
      name: "Box",
      size: 6,
      wholesalePrice: null,
      retailPrice: null,
    });
  });

  it("people without set_prices see the pack entries without the prices", async () => {
    const shop = await shopWithCatalog(t);
    const { owner, accessories } = shop;
    const p = await addProduct(owner, accessoryBody(accessories.id, "Priced pack item"));
    const added = await owner.post(`/products/${p.id}/packs`, {
      name: "Carton",
      size: 20,
      wholesalePrice: 777_000,
      retailPrice: 888_000,
    });
    const pack = added.json<{ product: Product }>().product.packUnits[0]!;
    await owner.post(`/products/${p.id}/packs/${pack.id}/retire`, {});

    const manager = await staffMember(t, shop, "manager", { set_prices: false });
    const res = await manager.client.get(`/products/${p.id}/history`);
    expect(res.statusCode).toBe(200);
    const history = res.json<ProductHistoryResponse>();
    expect(JSON.stringify(history), JSON.stringify(history)).not.toMatch(
      /777000|888000|(retail|wholesale)Price/,
    );
    expect(entries(history, "pack_added")[0]!.after).toEqual({ name: "Carton", size: 20 });
    expect(entries(history, "pack_retired")[0]!.before).toEqual({ name: "Carton", size: 20 });

    const priced = await staffMember(t, shop, "manager", { set_prices: true });
    const seen = (
      await priced.client.get(`/products/${p.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(entries(seen, "pack_added")[0]!.after).toMatchObject({ wholesalePrice: 777_000 });
  });
});
