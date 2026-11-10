import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Product, ProductsResponse } from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, phoneBody, shopWithCatalog } from "./catalog-fixtures";

describe("pack units (F01 §4, §10, §13.13)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("T12: a carton with its own barcode; scanning it finds the product with the carton pack", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const earphones = await addProduct(
      owner,
      accessoryBody(accessories.id, "Earphones X", { packUnits: [{ name: "Carton", size: 50 }] }),
    );
    const carton = earphones.packUnits[0]!;
    expect(carton).toMatchObject({ name: "Carton", size: 50, active: true });
    await owner.post(`/products/${earphones.id}/barcodes`, {
      value: "3330001112224",
      packUnitId: carton.id,
    });
    await owner.post(`/products/${earphones.id}/barcodes`, { value: "3330001112225" });

    const scan = (
      await owner.get("/products/lookup?barcode=3330001112224")
    ).json<ProductsResponse>();
    expect(scan.products).toHaveLength(1);
    const found = scan.products[0]!;
    expect(found.id).toBe(earphones.id);
    const hit = found.barcodes.find((b) => b.value === "3330001112224")!;
    expect(found.packUnits.find((p) => p.id === hit.packUnitId)).toMatchObject({
      name: "Carton",
      size: 50,
    });
    expect(found.barcodes.find((b) => b.value === "3330001112225")!.packUnitId).toBeNull();

    // A shop barcode can be made for the carton too, separately from the piece.
    const generated = (
      await owner.post(`/products/${earphones.id}/barcodes/generate`, { packUnitId: carton.id })
    ).json<{ product: Product }>().product;
    expect(generated.barcodes.find((b) => b.kind === "shop")).toMatchObject({
      packUnitId: carton.id,
    });
  });

  it("adds and retires packs; a retired pack takes its barcodes with it and its name can be reused", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, accessoryBody(accessories.id, "Cable"));
    const withBox = (
      await owner.post(`/products/${product.id}/packs`, {
        name: "Box",
        size: 10,
        wholesalePrice: 1_000_000,
      })
    ).json<{ product: Product }>().product;
    const box = withBox.packUnits[0]!;
    expect(box).toMatchObject({
      name: "Box",
      size: 10,
      wholesalePrice: 1_000_000,
      retailPrice: null,
    });
    expect(
      (await owner.post(`/products/${product.id}/packs`, { name: "box", size: 12 })).json().error
        .code,
    ).toBe("pack_exists");
    await owner.post(`/products/${product.id}/barcodes`, {
      value: "2220001112223",
      packUnitId: box.id,
    });

    const retired = (await owner.post(`/products/${product.id}/packs/${box.id}/retire`)).json<{
      product: Product;
    }>().product;
    expect(retired.packUnits[0]).toMatchObject({ active: false });
    expect(retired.barcodes[0]).toMatchObject({ active: false });
    expect((await owner.post(`/products/${product.id}/packs/${box.id}/retire`)).statusCode).toBe(
      200,
    );
    // The size is never edited: a new pack replaces the old one.
    const bigger = (
      await owner.post(`/products/${product.id}/packs`, { name: "Box", size: 12 })
    ).json<{ product: Product }>().product;
    expect(bigger.packUnits.filter((p) => p.active).map((p) => p.size)).toEqual([12]);
    const bad = await owner.post(`/products/${product.id}/barcodes`, {
      value: "2220001112229",
      packUnitId: box.id,
    });
    expect(bad.statusCode).toBe(404);
    expect(bad.json().error.code).toBe("pack_not_found");
  });

  it("packs are not allowed on IMEI or serial products (F01 §13.13)", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const phone = await addProduct(owner, phoneBody(phones.id));
    const res = await owner.post(`/products/${phone.id}/packs`, { name: "Box", size: 5 });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("packs_not_allowed");
    const created = await owner.post(
      "/products",
      phoneBody(phones.id, { colour: "Red", packUnits: [{ name: "Box", size: 5 }] }),
    );
    expect(created.statusCode).toBe(409);
    expect(created.json().error.code).toBe("packs_not_allowed");
    expect(
      (await owner.post(`/products/${phone.id}/packs`, { name: "Box", size: 1 })).statusCode,
    ).toBe(400);
  });
});
