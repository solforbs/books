import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Product } from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { addProduct, phoneBody, shopWithCatalog, staffMember } from "./catalog-fixtures";

describe("explicit names and optional parts", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("storage and colour are required too for phones and laptops (F01 §4)", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    for (const missing of ["storage", "colour"] as const) {
      const res = await owner.post("/products", phoneBody(phones.id, { [missing]: null }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error.details).toEqual([{ path: missing, message: "required" }]);
    }
  });

  it("PATCH keeps an explicit name sent together with changed parts", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const phone = await addProduct(owner, phoneBody(phones.id));
    const res = await owner.patch(`/products/${phone.id}`, {
      colour: "Blue",
      name: "Samsung A15 Blue (special)",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ product: Product }>().product).toMatchObject({
      colour: "Blue",
      name: "Samsung A15 Blue (special)",
    });
  });

  it("approve with only some fixes never rebuilds an edited name; a plain approve sends {}", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await addProduct(
      cashier.client,
      phoneBody(shop.phones.id, { retailPrice: undefined }),
    );
    await shop.owner.patch(`/products/${waiting.id}`, { name: "Samsung Galaxy A15 (edited)" });
    const done = await shop.owner.post(`/products/${waiting.id}/approve`, {
      retailPrice: 1_700_000,
    });
    expect(done.statusCode).toBe(200);
    expect(done.json<{ product: Product }>().product).toMatchObject({
      status: "active",
      name: "Samsung Galaxy A15 (edited)",
      retailPrice: 1_700_000,
    });
    const other = await addProduct(cashier.client, {
      categoryId: shop.accessories.id,
      name: "Plain item",
    });
    await shop.owner.patch(`/products/${other.id}`, { retailPrice: 500 });
    const plain = await shop.owner.post(`/products/${other.id}/approve`, {});
    expect(plain.json<{ product: Product }>().product.status).toBe("active");
  });
});
