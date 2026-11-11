import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  BulkCreateResponse,
  CheckProductResponse,
  Product,
  ProductHistoryResponse,
} from "@books/shared";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import {
  accessoryBody,
  addProduct,
  phoneBody,
  shopWithCatalog,
  staffMember,
} from "./catalog-fixtures";

describe("creating products (F01 §5, §6, §9)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("records the shop a product was added in, in its history (F01 §8, founders 1a)", async () => {
    const { owner, accessories, shop } = await shopWithCatalog(t);
    const withShop = await addProduct(owner, {
      ...accessoryBody(accessories.id, "Tripod"),
      locationId: shop.id,
    });
    const without = await addProduct(owner, accessoryBody(accessories.id, "Ring light"));
    const created = async (id: string) =>
      (await owner.get(`/products/${id}/history`))
        .json<ProductHistoryResponse>()
        .entries.find((e) => e.action === "created");
    expect((await created(withShop.id))?.after).toMatchObject({ locationId: shop.id });
    expect((await created(without.id))?.after).toMatchObject({ locationId: null });
  });

  it("refuses a location that is not an open location of this business", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const stranger = await shopWithCatalog(t);
    const res = await owner.post("/products", {
      ...accessoryBody(accessories.id, "Tripod"),
      locationId: stranger.shop.id,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("location_not_found");
  });

  it("T1: creates several at once and links them to one model group", async () => {
    const { owner, phones, tenantId } = await shopWithCatalog(t);
    const items = ["128GB", "256GB"].flatMap((storage) =>
      ["Blue", "Gold", "Graphite"].map((colour) =>
        phoneBody(phones.id, {
          brand: "Apple",
          model: "iPhone 13 Pro",
          storage,
          colour,
          condition: "New",
          source: "bulk",
        }),
      ),
    );
    const res = expectStatus(await owner.post("/products/bulk", { items }), 200);
    const { results } = res.json<BulkCreateResponse>();
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.error === null && r.product !== null)).toBe(true);
    expect(results.map((r) => r.product!.name)).toEqual([
      "Apple iPhone 13 Pro 128GB Blue New",
      "Apple iPhone 13 Pro 128GB Gold New",
      "Apple iPhone 13 Pro 128GB Graphite New",
      "Apple iPhone 13 Pro 256GB Blue New",
      "Apple iPhone 13 Pro 256GB Gold New",
      "Apple iPhone 13 Pro 256GB Graphite New",
    ]);
    expect(results.every((r) => r.product!.trackingType === "imei")).toBe(true);
    const groups = await t.tenantSql<{ model_group_key: string; n: string }>(
      tenantId,
      "select model_group_key, count(*) as n from products group by model_group_key",
    );
    expect(groups).toEqual([{ model_group_key: "apple|iphone13pro|||", n: "6" }]);
  });

  it("builds the name of a phone from its parts, cleaned, and needs all five parts", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const product = await addProduct(
      owner,
      phoneBody(phones.id, { brand: "  Samsung ", model: "Galaxy   A15", condition: "ex uk" }),
    );
    expect(product.name).toBe("Samsung Galaxy A15 128GB Black Ex-UK");
    expect(product).toMatchObject({ status: "active", trackingType: "imei", condition: "Ex-UK" });

    for (const missing of ["brand", "model", "storage", "colour", "condition"] as const) {
      const res = await owner.post("/products", phoneBody(phones.id, { [missing]: null }));
      expect(res.statusCode).toBe(400);
      // Without a model the contract itself asks for a name (name_required); the rest are "required".
      const detail =
        missing === "model"
          ? { path: "name", message: "name_required" }
          : { path: missing, message: "required" };
      expect(res.json().error).toMatchObject({ code: "validation_failed", details: [detail] });
    }
  });

  it("typed names are cleaned; a typed product needs a name", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(
      owner,
      accessoryBody(accessories.id, "  Phone   case  generic "),
    );
    expect(product.name).toBe("Phone case generic");
    expect(product.trackingType).toBe("quantity");
    expect(
      (await owner.post("/products", { categoryId: accessories.id, retailPrice: 1 })).statusCode,
    ).toBe(400);
  });

  it("T2: blocks the same parts after cleaning (extra spaces, capitals)", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const first = await addProduct(
      owner,
      phoneBody(phones.id, {
        brand: "Apple",
        model: "iPhone 13 Pro",
        storage: "128GB",
        colour: "Blue",
      }),
    );
    const res = await owner.post(
      "/products",
      phoneBody(phones.id, {
        brand: "Apple ",
        model: "iphone  13 pro",
        storage: "128gb",
        colour: "blue",
        condition: "new",
      }),
    );
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatchObject({
      code: "duplicate_product",
      details: { existingId: first.id },
    });
    // Another colour is another product.
    await addProduct(
      owner,
      phoneBody(phones.id, {
        brand: "Apple",
        model: "iPhone 13 Pro",
        storage: "128GB",
        colour: "Gold",
      }),
    );
  });

  it("T3: warns about a similar name, then creates it once the person says it is different", async () => {
    const { owner, accessories, tenantId } = await shopWithCatalog(t);
    const existing = await addProduct(owner, accessoryBody(accessories.id, "Type-C cable 1m"));
    const body = accessoryBody(accessories.id, "USB C cable 1m");

    const warned = await owner.post("/products", body);
    expect(warned.statusCode).toBe(409);
    const error = warned.json().error;
    expect(error.code).toBe("similar_products");
    expect(error.details.products.map((p: Product) => p.id)).toEqual([existing.id]);

    const created = await addProduct(owner, { ...body, acknowledgeSimilar: true });
    const history = expectStatus(
      await owner.get(`/products/${created.id}/history`),
      200,
    ).json<ProductHistoryResponse>();
    const note = history.entries.find((e) => e.action === "similar_acknowledged");
    expect(note?.by.name).toBe("Amina Hassan");
    expect(note?.after).toEqual({ products: [{ id: existing.id, name: "Type-C cable 1m" }] });
    const audit = await t.sql(
      "select details from audit_log where action = 'product_created' and tenant_id = $1 and target_id = $2",
      [tenantId, created.id],
    );
    expect(audit[0]).toMatchObject({ details: { acknowledgedSimilar: [existing.id] } });

    // A different specification is not "similar".
    await addProduct(owner, accessoryBody(accessories.id, "USB C cable 2m"));
  });

  it("warns about a similar model (A15 vs Galaxy A15) only for the same variant", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    await addProduct(owner, phoneBody(phones.id, { model: "A15" }));
    const res = await owner.post("/products", phoneBody(phones.id, { model: "Galaxy A15" }));
    expect(res.json().error.code).toBe("similar_products");
    // Another storage of the Galaxy A15 is a legitimate variant: no warning.
    await addProduct(owner, phoneBody(phones.id, { model: "Galaxy A15", storage: "256GB" }));
    // Siblings of one model never warn.
    await addProduct(owner, phoneBody(phones.id, { model: "A15", colour: "Blue" }));
  });

  it("the check endpoint is a dry run: name, exact duplicate, similar products, barcode clashes", async () => {
    const { owner, phones, accessories, tenantId } = await shopWithCatalog(t);
    const phone = await addProduct(owner, phoneBody(phones.id, { barcodes: ["8806094501234"] }));
    const cable = await addProduct(owner, accessoryBody(accessories.id, "Type-C cable 1m"));
    const check = async (body: object) =>
      expectStatus(await owner.post("/products/check", body), 200).json<CheckProductResponse>();

    expect(await check(phoneBody(phones.id))).toMatchObject({
      name: "Samsung A15 128GB Black New",
      exactDuplicate: { id: phone.id },
      similar: [],
    });
    const fresh = await check(
      phoneBody(phones.id, { colour: "Blue", barcodes: ["8806094501234"] }),
    );
    expect(fresh.exactDuplicate).toBeNull();
    expect(fresh.barcodeClashes).toMatchObject([
      { barcode: "8806094501234", product: { id: phone.id } },
    ]);
    expect((await check(accessoryBody(accessories.id, "USB C cable 1m"))).similar[0]?.id).toBe(
      cable.id,
    );
    expect((await owner.get("/products")).json().products).toHaveLength(2);
    const [count] = await t.tenantSql<{ n: string }>(
      tenantId,
      "select count(*) as n from products",
    );
    expect(count?.n).toBe("2");
  });

  it("bulk creates each row on its own: duplicates and bad rows fail alone", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    await addProduct(
      owner,
      accessoryBody(accessories.id, "Screen guard", { barcodes: ["1112223334445"] }),
    );
    const res = expectStatus(
      await owner.post("/products/bulk", {
        items: [
          accessoryBody(accessories.id, "Phone stand"),
          accessoryBody(accessories.id, "screen  GUARD"), // duplicate of an existing product
          accessoryBody(accessories.id, "Selfie stick", { barcodes: ["1112223334445"] }), // barcode clash
          accessoryBody(accessories.id, "Ring light", { barcodes: ["12"] }), // invalid barcode
          accessoryBody(accessories.id, "Phone stand"), // repeats row 0
          accessoryBody(accessories.id, "Tripod"),
        ],
      }),
      200,
    ).json<BulkCreateResponse>();
    expect(res.results.map((r) => r.error?.code ?? "ok")).toEqual([
      "ok",
      "duplicate_product",
      "barcode_in_use",
      "invalid_barcode",
      "duplicate_product",
      "ok",
    ]);
    expect(res.results.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect((await owner.get("/products")).json().products).toHaveLength(3);
  });

  it("T4: a barcode already used by another product is refused, naming that product", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const first = await addProduct(
      owner,
      accessoryBody(accessories.id, "Earphones X", { barcodes: ["6901234567892"] }),
    );
    const res = await owner.post(
      "/products",
      accessoryBody(accessories.id, "Phone case", { barcodes: ["6901234567892"] }),
    );
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatchObject({
      code: "barcode_in_use",
      details: { productId: first.id, barcode: "6901234567892", productName: "Earphones X" },
    });
    expect((await owner.get("/products")).json().products).toHaveLength(1);
  });

  it("an owner working alone adds Active products: nothing waits, nothing to approve (G1)", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, accessoryBody(accessories.id, "Power bank"));
    expect(product.status).toBe("active");
    const waiting = expectStatus(await owner.get("/products/waiting"), 200).json();
    expect(waiting.products).toEqual([]);
    expect((await owner.get("/products?status=waiting")).json().products).toEqual([]);
  });

  it("an approver must give a price; a manager without set_prices may leave it for later", async () => {
    const shop = await shopWithCatalog(t);
    const res = await shop.owner.post("/products", {
      categoryId: shop.accessories.id,
      name: "No price",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details).toEqual([{ path: "retailPrice", message: "price_required" }]);

    const manager = await staffMember(t, shop, "manager", { set_prices: false });
    const body = accessoryBody(shop.accessories.id, "Awaiting price");
    const withPrice = await manager.client.post("/products", body);
    expect(withPrice.statusCode).toBe(403);
    const ok = await addProduct(manager.client, {
      categoryId: shop.accessories.id,
      name: "Awaiting price",
    });
    expect(ok).toMatchObject({ status: "active", retailPrice: null });
  });

  it("stores the VAT type only when the business charges VAT (G3)", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const off = await addProduct(
      owner,
      accessoryBody(accessories.id, "Cable A", { vatType: "standard" }),
    );
    expect(off.vatType).toBeNull();
    expectStatus(await owner.put("/business", { name: "Nuru Electronics", vatEnabled: true }), 200);
    const on = await addProduct(
      owner,
      accessoryBody(accessories.id, "Cable B", { vatType: "exempt" }),
    );
    expect(on.vatType).toBe("exempt");
  });

  it("never accepts or returns a cost", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, {
      ...accessoryBody(accessories.id, "Cable C"),
      cost: 100,
    } as never);
    expect(JSON.stringify(product)).not.toMatch(/cost/i);
  });

  it("people who may not add products get 403", async () => {
    const shop = await shopWithCatalog(t);
    const accountant = await staffMember(t, shop, "accountant");
    const res = await accountant.client.post(
      "/products",
      accessoryBody(shop.accessories.id, "Nope"),
    );
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("forbidden");
    expect(
      (
        await accountant.client.post("/products/bulk", {
          items: [accessoryBody(shop.accessories.id, "Nope")],
        })
      ).statusCode,
    ).toBe(403);
  });
});
