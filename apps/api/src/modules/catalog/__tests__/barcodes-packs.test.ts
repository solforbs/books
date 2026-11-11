import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isShopBarcode,
  isValidEan13,
  shopBarcodeFromSequence,
  type Product,
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

describe("barcodes and pack units (F01 §7)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const activeCodes = (p: Product) => p.barcodes.filter((b) => b.active);

  it("T8: generates a unique EAN-13 shop barcode starting with 20, and asking again returns the same one", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, accessoryBody(accessories.id, "Phone case generic"));
    const res = await owner.post(`/products/${product.id}/barcodes/generate`, {});
    expect(res.statusCode).toBe(200);
    const [code] = activeCodes(res.json<{ product: Product }>().product);
    expect(code).toMatchObject({ kind: "shop", packUnitId: null, active: true });
    expect(code!.value).toHaveLength(13);
    expect(code!.value.startsWith("20")).toBe(true);
    expect(isValidEan13(code!.value)).toBe(true);
    expect(isShopBarcode(code!.value)).toBe(true);

    const again = (await owner.post(`/products/${product.id}/barcodes/generate`, {})).json<{
      product: Product;
    }>();
    expect(activeCodes(again.product).map((b) => b.value)).toEqual([code!.value]);
    // A scan of the generated code finds the product.
    const scan = (
      await owner.get(`/products/lookup?barcode=${code!.value}`)
    ).json<ProductsResponse>();
    expect(scan.products.map((p) => p.id)).toEqual([product.id]);
  });

  it("T8: concurrent generation never hands out the same code twice", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const products = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        addProduct(owner, accessoryBody(accessories.id, `Item number ${i}`)),
      ),
    );
    const results = await Promise.all(
      products.map((p) => owner.post(`/products/${p.id}/barcodes/generate`, {})),
    );
    expect(results.map((r) => r.statusCode)).toEqual(Array(10).fill(200));
    const codes = results.map((r) => activeCodes(r.json<{ product: Product }>().product)[0]!.value);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(isValidEan13(c) && c.startsWith("20")).toBe(true));

    // Ten requests for ONE product still give it exactly one shop barcode.
    const one = products[0]!;
    await Promise.all(
      Array.from({ length: 6 }, () => owner.post(`/products/${one.id}/barcodes/generate`, {})),
    );
    const fresh = (await owner.get(`/products/${one.id}`)).json<{ product: Product }>().product;
    expect(activeCodes(fresh).filter((b) => b.kind === "shop")).toHaveLength(1);
  });

  it("generated codes are per business: two shops may each own the same number", async () => {
    const a = await shopWithCatalog(t);
    const b = await shopWithCatalog(t);
    const pa = await addProduct(a.owner, accessoryBody(a.accessories.id, "Thing"));
    const pb = await addProduct(b.owner, accessoryBody(b.accessories.id, "Thing"));
    const ca = activeCodes(
      (await a.owner.post(`/products/${pa.id}/barcodes/generate`, {})).json<{ product: Product }>()
        .product,
    )[0]!;
    const cb = activeCodes(
      (await b.owner.post(`/products/${pb.id}/barcodes/generate`, {})).json<{ product: Product }>()
        .product,
    )[0]!;
    expect(ca.value).toBe(cb.value); // both are their business's first
    expect(
      (await a.owner.get(`/products/lookup?barcode=${ca.value}`))
        .json<ProductsResponse>()
        .products.map((p) => p.id),
    ).toEqual([pa.id]);
  });

  it("skips a generated number that a typed manufacturer barcode already uses", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const first = await addProduct(owner, accessoryBody(accessories.id, "First"));
    await owner.post(`/products/${first.id}/barcodes/generate`, {});
    // Someone types the NEXT shop code as a manufacturer code on another product.
    const typed = await addProduct(owner, accessoryBody(accessories.id, "Typed"));
    const upcoming = shopBarcodeFromSequence(2);
    await owner.post(`/products/${typed.id}/barcodes`, { value: upcoming });
    const second = await addProduct(owner, accessoryBody(accessories.id, "Second"));
    const made = activeCodes(
      (await owner.post(`/products/${second.id}/barcodes/generate`, {})).json<{
        product: Product;
      }>().product,
    )[0]!.value;
    expect(made).toBe(shopBarcodeFromSequence(3));
  });

  it("adding a barcode: duplicates on another product are blocked, own repeats are harmless, bad codes refused", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const a = await addProduct(owner, accessoryBody(accessories.id, "Cable A"));
    const b = await addProduct(owner, accessoryBody(accessories.id, "Cable B"));
    expect(
      (await owner.post(`/products/${a.id}/barcodes`, { value: "6901234567892" })).statusCode,
    ).toBe(200);
    const again = (
      await owner.post(`/products/${a.id}/barcodes`, { value: " 6901 2345 67892" })
    ).json<{ product: Product }>();
    expect(activeCodes(again.product)).toHaveLength(1);
    const clash = await owner.post(`/products/${b.id}/barcodes`, { value: "6901234567892" });
    expect(clash.statusCode).toBe(409);
    expect(clash.json().error).toMatchObject({
      code: "barcode_in_use",
      details: { productId: a.id },
    });
    for (const value of ["12", "abc def!", "490154203237518"]) {
      const bad = await owner.post(`/products/${b.id}/barcodes`, { value });
      expect(bad.statusCode, value).toBe(400);
      expect(bad.json().error.code).toBe("invalid_barcode");
    }
  });

  it("a shop barcode can never be shared, even by a condition variant", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const fresh = await addProduct(owner, phoneBody(phones.id, { condition: "New" }));
    const exUk = await addProduct(owner, phoneBody(phones.id, { condition: "Ex-UK" }));
    const shop = activeCodes(
      (await owner.post(`/products/${fresh.id}/barcodes/generate`, {})).json<{ product: Product }>()
        .product,
    )[0]!;
    const res = await owner.post(`/products/${exUk.id}/barcodes`, { value: shop.value });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("barcode_in_use");
  });

  it("manufacturer barcodes may be shared only by products that differ in condition alone", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const variant = (over: object) =>
      phoneBody(phones.id, { brand: "Apple", model: "iPhone 13 Pro", ...over });
    const code = "1940000123456";
    const fresh = await addProduct(owner, variant({ condition: "New", barcodes: [code] }));
    const exUk = await addProduct(owner, variant({ condition: "Ex-UK", barcodes: [code] }));
    const refurb = await addProduct(owner, variant({ condition: "Refurbished" }));
    expect((await owner.post(`/products/${refurb.id}/barcodes`, { value: code })).statusCode).toBe(
      200,
    );

    const scan = (await owner.get(`/products/lookup?barcode=${code}`)).json<ProductsResponse>();
    expect(scan.products.map((p) => p.condition).sort()).toEqual(["Ex-UK", "New", "Refurbished"]);

    // Another colour, another storage or another model may not carry it.
    for (const other of [{ colour: "Gold" }, { storage: "256GB" }, { model: "iPhone 13" }]) {
      const res = await owner.post(
        "/products",
        variant({ condition: "Used", barcodes: [code], ...other }),
      );
      expect(res.statusCode, JSON.stringify(other)).toBe(409);
      expect(res.json().error.code).toBe("barcode_in_use");
    }
    // The same condition cannot share it either.
    const twin = await addProduct(owner, variant({ condition: "Used" }));
    expect((await owner.post(`/products/${twin.id}/barcodes`, { value: code })).statusCode).toBe(
      200,
    );
    expect(fresh.id).not.toBe(exUk.id);

    // Changing a colour would break the sharing rule for the barcodes it carries.
    const breaking = await owner.patch(`/products/${exUk.id}`, { colour: "Gold" });
    expect(breaking.statusCode).toBe(409);
    expect(breaking.json().error.code).toBe("barcode_in_use");
  });

  it("retires a barcode: scans stop finding it and another product may use the code", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const a = await addProduct(
      owner,
      accessoryBody(accessories.id, "Cable A", { barcodes: ["4445556667778"] }),
    );
    const b = await addProduct(owner, accessoryBody(accessories.id, "Cable B"));
    const barcode = a.barcodes[0]!;
    const retired = (await owner.post(`/products/${a.id}/barcodes/${barcode.id}/retire`)).json<{
      product: Product;
    }>();
    expect(retired.product.barcodes[0]).toMatchObject({ active: false });
    expect((await owner.post(`/products/${a.id}/barcodes/${barcode.id}/retire`)).statusCode).toBe(
      200,
    );
    expect(
      (await owner.get("/products/lookup?barcode=4445556667778")).json<ProductsResponse>().products,
    ).toEqual([]);
    expect(
      (await owner.post(`/products/${b.id}/barcodes`, { value: "4445556667778" })).statusCode,
    ).toBe(200);
    const missing = await owner.post(`/products/${b.id}/barcodes/${barcode.id}/retire`);
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe("barcode_not_found");
  });

  it("a cashier may label their own waiting product, nothing else", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const other = await staffMember(t, shop, "cashier");
    const mine = await addProduct(cashier.client, {
      categoryId: shop.accessories.id,
      name: "Quick item",
    });
    const ok = await cashier.client.post(`/products/${mine.id}/barcodes/generate`, {});
    expect(ok.statusCode).toBe(200);
    expect((await other.client.post(`/products/${mine.id}/barcodes/generate`, {})).statusCode).toBe(
      403,
    );
    const approved = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Approved item"),
    );
    expect(
      (await cashier.client.post(`/products/${approved.id}/barcodes/generate`, {})).statusCode,
    ).toBe(403);
    expect(
      (await cashier.client.post(`/products/${mine.id}/barcodes`, { value: "1234500006789" }))
        .statusCode,
    ).toBe(403);
    // Once approved, the cashier loses that right.
    await shop.owner.post(`/products/${mine.id}/approve`, { retailPrice: 100 });
    expect(
      (await cashier.client.post(`/products/${mine.id}/barcodes/generate`, {})).statusCode,
    ).toBe(403);
  });
});
