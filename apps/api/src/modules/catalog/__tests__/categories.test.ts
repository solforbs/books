import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Category } from "@books/shared";
import { expectStatus, ownerWithShop } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import {
  accessoryBody,
  addProduct,
  createCategory,
  shopWithCatalog,
  staffMember,
} from "./catalog-fixtures";

describe("product categories (F01 §4)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("creates, lists and renames the owner's own categories; none exist at the start", async () => {
    const { owner } = await ownerWithShop(t);
    expect((await owner.get("/product-categories")).json().categories).toEqual([]);

    const phones = await createCategory(owner, {
      name: "  Phones ",
      defaultTracking: "imei",
      namingMode: "parts",
    });
    expect(phones).toMatchObject({
      name: "Phones",
      defaultTracking: "imei",
      namingMode: "parts",
      hidden: false,
      productCount: 0,
    });
    const renamed = expectStatus(
      await owner.patch(`/product-categories/${phones.id}`, { name: "Mobile phones" }),
      200,
    );
    expect(renamed.json().category.name).toBe("Mobile phones");
    const list = (await owner.get("/product-categories")).json<{ categories: Category[] }>();
    expect(list.categories.map((c) => c.name)).toEqual(["Mobile phones"]);
  });

  it("refuses a second category with the same name, ignoring capitals and spaces", async () => {
    const { owner } = await ownerWithShop(t);
    const chargers = await createCategory(owner, { name: "Chargers" });
    const res = await owner.post("/product-categories", { name: " chargers " });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("category_exists");
    const other = await createCategory(owner, { name: "Cables" });
    const clash = await owner.patch(`/product-categories/${other.id}`, { name: "CHARGERS" });
    expect(clash.json().error.code).toBe("category_exists");
    // Renaming to its own name in another case is fine.
    expectStatus(
      await owner.patch(`/product-categories/${chargers.id}`, { name: "CHARGERS" }),
      200,
    );
  });

  it("cannot hide a category that still has products; hiding the products first allows it", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const product = await addProduct(owner, accessoryBody(accessories.id, "Phone case"));
    const blocked = await owner.patch(`/product-categories/${accessories.id}`, { hidden: true });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toMatchObject({
      code: "category_in_use",
      details: { productCount: 1 },
    });
    const listed = (await owner.get("/product-categories")).json<{ categories: Category[] }>();
    expect(listed.categories.find((c) => c.id === accessories.id)?.productCount).toBe(1);

    expectStatus(await owner.post(`/products/${product.id}/hide`), 200);
    const ok = expectStatus(
      await owner.patch(`/product-categories/${accessories.id}`, { hidden: true }),
      200,
    );
    expect(ok.json().category.hidden).toBe(true);
  });

  it("hidden categories are listed only to people who manage products, and take no new products", async () => {
    const shop = await shopWithCatalog(t);
    await expectStatus(
      await shop.owner.patch(`/product-categories/${shop.accessories.id}`, { hidden: true }),
      200,
    );
    const cashier = await staffMember(t, shop, "cashier");
    const seen = (await cashier.client.get("/product-categories")).json<{
      categories: Category[];
    }>();
    expect(seen.categories.map((c) => c.name)).toEqual(["Phones"]);
    const mine = (await shop.owner.get("/product-categories")).json<{ categories: Category[] }>();
    expect(mine.categories).toHaveLength(2);

    const res = await shop.owner.post("/products", accessoryBody(shop.accessories.id, "Cable"));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("category_not_found");
  });

  it("only people with manage_products change categories (a cashier cannot)", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    expect((await cashier.client.post("/product-categories", { name: "Hacked" })).statusCode).toBe(
      403,
    );
    const patch = await cashier.client.patch(`/product-categories/${shop.phones.id}`, {
      name: "Hacked",
    });
    expect(patch.statusCode).toBe(403);
    expect(patch.json().error.code).toBe("forbidden");
    const manager = await staffMember(t, shop, "manager");
    expectStatus(await manager.client.post("/product-categories", { name: "Laptops" }), 201);
  });

  it("validates input and answers 404 for unknown ids", async () => {
    const { owner } = await ownerWithShop(t);
    expect((await owner.post("/product-categories", { name: "x" })).statusCode).toBe(400);
    expect((await owner.post("/product-categories", {})).statusCode).toBe(400);
    const res = await owner.patch("/product-categories/00000000-0000-4000-8000-000000000000", {
      name: "Nope",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("category_not_found");
  });
});
