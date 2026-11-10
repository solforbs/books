import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Product, ProductHistoryResponse, ProductsResponse } from "@books/shared";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { ProductUsageProbe } from "../application/product-usage-probe";
import { accessoryBody, addProduct, shopWithCatalog, staffMember } from "./catalog-fixtures";

describe("approving new products (F01 §8, G1)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const quickAdd = (categoryId: string, name: string) =>
    accessoryBody(categoryId, name, { source: "quick_add", retailPrice: undefined });

  it("T5: a cashier's product waits, can be seen by all, and only approvers get the waiting list", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const product = await addProduct(
      cashier.client,
      quickAdd(shop.accessories.id, "Oraimo 20W charger"),
    );
    expect(product).toMatchObject({
      status: "waiting",
      retailPrice: null,
      addedBy: { id: cashier.userId, name: cashier.name },
    });

    // Waiting products are in the normal list so they can be received and sold.
    const seen = (await cashier.client.get("/products")).json<ProductsResponse>();
    expect(seen.products.map((p) => p.id)).toEqual([product.id]);

    const denied = await cashier.client.get("/products/waiting");
    expect(denied.statusCode).toBe(403);
    const waiting = expectStatus(
      await shop.owner.get("/products/waiting"),
      200,
    ).json<ProductsResponse>();
    expect(waiting.products).toHaveLength(1);
    expect(waiting.products[0]!.addedBy.name).toBe(cashier.name);
    const source = await t.tenantSql(shop.tenantId, "select source from products where id = $1", [
      product.id,
    ]);
    expect(source).toEqual([{ source: "quick_add" }]);
  });

  it("a cashier cannot put a price on a product; a storekeeper's product waits too", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const priced = await cashier.client.post(
      "/products",
      accessoryBody(shop.accessories.id, "Priced"),
    );
    expect(priced.statusCode).toBe(403);
    const keeper = await staffMember(t, shop, "storekeeper");
    expect((await addProduct(keeper.client, quickAdd(shop.accessories.id, "Box"))).status).toBe(
      "waiting",
    );
  });

  it("an approver approves with fixes: name, category and price", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const product = await addProduct(
      cashier.client,
      quickAdd(shop.accessories.id, "Oraimo chrger"),
    );

    const noPrice = await shop.owner.post(`/products/${product.id}/approve`, {});
    expect(noPrice.statusCode).toBe(400);
    expect(noPrice.json().error.details).toEqual([
      { path: "retailPrice", message: "price_required" },
    ]);

    const done = expectStatus(
      await shop.owner.post(`/products/${product.id}/approve`, {
        name: "Oraimo Charger",
        retailPrice: 120_000,
      }),
      200,
    ).json<{ product: Product }>().product;
    expect(done).toMatchObject({ status: "active", name: "Oraimo Charger", retailPrice: 120_000 });

    const again = await shop.owner.post(`/products/${product.id}/approve`, {});
    expect(again.json().error.code).toBe("not_waiting");
    const history = (
      await shop.owner.get(`/products/${product.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(history.entries.map((e) => e.action)).toContain("approved");
    expect(history.entries.find((e) => e.field === "name")).toMatchObject({
      before: "Oraimo chrger",
      after: "Oraimo Charger",
    });
  });

  it("cashiers and storekeepers cannot approve, merge or reject; a manager with approve_items off cannot either", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const product = await addProduct(cashier.client, quickAdd(shop.accessories.id, "Cable"));
    const other = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Cable long"));
    const limited = await staffMember(t, shop, "manager", { approve_items: false });
    for (const who of [cashier.client, limited.client]) {
      expect((await who.post(`/products/${product.id}/approve`, {})).statusCode).toBe(403);
      expect((await who.post(`/products/${product.id}/reject`)).statusCode).toBe(403);
      const merge = await who.post(`/products/${product.id}/merge`, { intoProductId: other.id });
      expect(merge.statusCode).toBe(403);
      expect((await who.patch(`/products/${product.id}`, { name: "x" })).statusCode).toBe(
        who === cashier.client ? 403 : 200,
      );
    }
  });

  it("T6: an allowed manager merges a waiting product into an existing one", async () => {
    const shop = await shopWithCatalog(t);
    const existing = await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Oraimo 20W Charger", { barcodes: ["6921234567890"] }),
    );
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await addProduct(cashier.client, {
      ...quickAdd(shop.accessories.id, "Oraimo charger 20W"),
      acknowledgeSimilar: true,
    });
    const manager = await staffMember(t, shop, "manager");
    await expectStatus(
      await manager.client.post(`/products/${waiting.id}/barcodes`, { value: "8801112223334" }),
      200,
    );

    const merged = expectStatus(
      await manager.client.post(`/products/${waiting.id}/merge`, { intoProductId: existing.id }),
      200,
    ).json<{ product: Product }>().product;
    expect(merged).toMatchObject({ status: "merged", mergedIntoId: existing.id });
    expect(merged.barcodes.filter((b) => b.active)).toEqual([]);

    const target = (await shop.owner.get(`/products/${existing.id}`)).json<{ product: Product }>()
      .product;
    expect(
      target.barcodes
        .filter((b) => b.active)
        .map((b) => b.value)
        .sort(),
    ).toEqual(["6921234567890", "8801112223334"]);
    const history = (
      await shop.owner.get(`/products/${waiting.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(history.entries[0]).toMatchObject({
      action: "merged",
      by: { name: manager.name },
      after: { status: "merged", intoProductId: existing.id },
    });
    const targetHistory = (
      await shop.owner.get(`/products/${existing.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(targetHistory.entries[0]).toMatchObject({ action: "merge_received" });

    // The merged product is gone from the lists and a scan finds the surviving one.
    expect(
      (await shop.owner.get("/products")).json<ProductsResponse>().products.map((p) => p.id),
    ).toEqual([existing.id]);
    const scan = (
      await shop.owner.get("/products/lookup?barcode=8801112223334")
    ).json<ProductsResponse>();
    expect(scan.products.map((p) => p.id)).toEqual([existing.id]);
    // Merging cannot be undone or repeated.
    const again = await manager.client.post(`/products/${waiting.id}/merge`, {
      intoProductId: existing.id,
    });
    expect(again.json().error.code).toBe("product_closed");
  });

  it("merge refuses itself, unknown targets and targets that are no longer in use", async () => {
    const shop = await shopWithCatalog(t);
    const other = await shopWithCatalog(t);
    const a = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Item A"));
    const b = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Item B"));
    const foreign = await addProduct(other.owner, accessoryBody(other.accessories.id, "Item C"));
    const merge = async (id: string, into: string) =>
      (await shop.owner.post(`/products/${id}/merge`, { intoProductId: into })).json().error;

    expect(await merge(a.id, a.id)).toMatchObject({
      code: "invalid_merge_target",
      details: { reason: "same_product" },
    });
    expect(await merge(a.id, foreign.id)).toMatchObject({
      code: "invalid_merge_target",
      details: { reason: "not_found" },
    });
    expect(
      (await shop.owner.post(`/products/${foreign.id}/merge`, { intoProductId: a.id })).statusCode,
    ).toBe(404);
    await shop.owner.post(`/products/${b.id}/hide`);
    expect(await merge(a.id, b.id)).toMatchObject({
      code: "invalid_merge_target",
      details: { reason: "target_hidden" },
    });
  });

  it("merge moves a pack the target lacks, joins one it has, and never leaves a carton code on a piece", async () => {
    const shop = await shopWithCatalog(t);
    const target = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Earphones X"));
    const source = await addProduct(shop.owner, {
      ...accessoryBody(shop.accessories.id, "Earphones X new"),
      acknowledgeSimilar: true,
    });
    await shop.owner.post(`/products/${target.id}/packs`, { name: "Box", size: 10 });
    const withPacks = (
      await shop.owner.post(`/products/${source.id}/packs`, { name: "Box", size: 10 })
    ).json<{ product: Product }>().product;
    const sourceBox = withPacks.packUnits[0]!;
    await shop.owner.post(`/products/${source.id}/barcodes`, {
      value: "5550001110001",
      packUnitId: sourceBox.id,
    });
    const carton = (
      await shop.owner.post(`/products/${source.id}/packs`, { name: "Carton", size: 50 })
    )
      .json<{ product: Product }>()
      .product.packUnits.find((p) => p.name === "Carton")!;
    await shop.owner.post(`/products/${source.id}/barcodes`, {
      value: "5550001110002",
      packUnitId: carton.id,
    });

    expectStatus(
      await shop.owner.post(`/products/${source.id}/merge`, { intoProductId: target.id }),
      200,
    );
    const merged = (await shop.owner.get(`/products/${target.id}`)).json<{ product: Product }>()
      .product;
    const active = merged.packUnits.filter((p) => p.active);
    expect(active.map((p) => `${p.name}:${p.size}`).sort()).toEqual(["Box:10", "Carton:50"]);
    const box = active.find((p) => p.name === "Box")!;
    const cartonNow = active.find((p) => p.name === "Carton")!;
    const byValue = Object.fromEntries(
      merged.barcodes.filter((b) => b.active).map((b) => [b.value, b.packUnitId]),
    );
    expect(byValue).toEqual({ "5550001110001": box.id, "5550001110002": cartonNow.id });
  });

  it("T7: rejecting a waiting product that is in use is refused; otherwise it is rejected and frees its barcodes", async () => {
    const shop = await shopWithCatalog(t);
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await addProduct(cashier.client, {
      ...quickAdd(shop.accessories.id, "Mystery cable"),
      barcodes: ["7770001112223"],
    });
    const probe = t.app.get(ProductUsageProbe);
    const spy = vi.spyOn(probe, "usageOf").mockResolvedValue({ stockQuantity: 0, saleCount: 1 });
    try {
      const res = await shop.owner.post(`/products/${waiting.id}/reject`);
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatchObject({
        code: "product_in_use",
        details: { stockQuantity: 0, saleCount: 1 },
      });
    } finally {
      spy.mockRestore();
    }
    const rejected = expectStatus(
      await shop.owner.post(`/products/${waiting.id}/reject`),
      200,
    ).json<{
      product: Product;
    }>().product;
    expect(rejected.status).toBe("rejected");
    // The code and the name are free again.
    await addProduct(
      shop.owner,
      accessoryBody(shop.accessories.id, "Mystery cable", { barcodes: ["7770001112223"] }),
    );
    expect((await shop.owner.post(`/products/${waiting.id}/reject`)).json().error.code).toBe(
      "product_closed",
    );
    const active = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Fine product"));
    expect((await shop.owner.post(`/products/${active.id}/reject`)).json().error.code).toBe(
      "not_waiting",
    );
  });
});
