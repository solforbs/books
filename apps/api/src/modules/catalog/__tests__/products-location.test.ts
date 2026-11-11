import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProductHistoryResponse } from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, shopWithCatalog } from "./catalog-fixtures";

describe("where a product was added (F01 §8)", () => {
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
});
