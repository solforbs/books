import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Product, ProductsResponse } from "@books/shared";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, phoneBody, shopWithCatalog } from "./catalog-fixtures";

/** Barcode letters are case-insensitive (founders, 2026-11-11). */
describe("barcode letters are case-insensitive", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const codes = (p: Product) => p.barcodes.filter((b) => b.active).map((b) => b.value);

  it("stores barcodes upper-case and refuses the same code in another case", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const first = await addProduct(
      owner,
      accessoryBody(accessories.id, "Label item one", { barcodes: ["abc-123"] }),
    );
    expect(codes(first)).toEqual(["ABC-123"]);

    for (const value of ["ABC-123", "Abc-123", "abc-123"]) {
      const res = await owner.post(
        "/products",
        accessoryBody(accessories.id, `Another ${value}`, { barcodes: [value] }),
      );
      expect(res.statusCode, value).toBe(409);
      expect(res.json().error.code).toBe("barcode_in_use");
    }
    const second = await addProduct(owner, accessoryBody(accessories.id, "Label item two"));
    const add = await owner.post(`/products/${second.id}/barcodes`, { value: "aBc-123" });
    expect(add.statusCode).toBe(409);
    expect(add.json().error.code).toBe("barcode_in_use");

    // The duplicate check endpoint and bulk agree.
    const check = await owner.post(
      "/products/check",
      accessoryBody(accessories.id, "Third name", { barcodes: ["abc-123"] }),
    );
    expect(check.json().barcodeClashes).toHaveLength(1);
    const bulk = await owner.post("/products/bulk", {
      items: [accessoryBody(accessories.id, "Bulk label", { barcodes: ["ABC-123"] })],
    });
    expect(bulk.json().results[0].error.code).toBe("barcode_in_use");
  });

  it("adding the same code again in another case to the same product changes nothing", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const p = await addProduct(
      owner,
      accessoryBody(accessories.id, "Twice", { barcodes: ["TW-1"] }),
    );
    const again = await owner.post(`/products/${p.id}/barcodes`, { value: "tw-1" });
    expect(again.statusCode).toBe(200);
    expect(codes(again.json<{ product: Product }>().product)).toEqual(["TW-1"]);
  });

  it("finds the product whatever case is scanned or searched", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const p = await addProduct(
      owner,
      accessoryBody(accessories.id, "Scanned thing", { barcodes: ["Mx-77/b"] }),
    );
    for (const scanned of ["mx-77/b", "MX-77/B", "Mx-77/B"]) {
      const scan = (
        await owner.get(`/products/lookup?barcode=${encodeURIComponent(scanned)}`)
      ).json<ProductsResponse>();
      expect(
        scan.products.map((x) => x.id),
        scanned,
      ).toEqual([p.id]);
    }
    for (const q of ["mx-77", "MX-77", "mX-77/B"]) {
      const found = (
        await owner.get(`/products?q=${encodeURIComponent(q)}`)
      ).json<ProductsResponse>();
      expect(
        found.products.map((x) => x.id),
        q,
      ).toEqual([p.id]);
    }
  });

  it("condition variants still share a code, whatever the case", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const variant = (over: object) =>
      phoneBody(phones.id, { brand: "Apple", model: "iPhone 13 Pro", ...over });
    await addProduct(owner, variant({ condition: "New", barcodes: ["gtin-x1"] }));
    await addProduct(owner, variant({ condition: "Ex-UK", barcodes: ["GTIN-X1"] }));
    const scan = (await owner.get("/products/lookup?barcode=Gtin-X1")).json<ProductsResponse>();
    expect(scan.products.map((p) => p.condition).sort()).toEqual(["Ex-UK", "New"]);
    // A different product (another colour) may not take it in any case.
    const clash = await owner.post("/products", variant({ colour: "Gold", barcodes: ["gtin-X1"] }));
    expect(clash.statusCode).toBe(409);
  });

  it("the migration upper-cases old codes and retires the newer of two that differ only by case", async () => {
    const { owner, accessories, tenantId } = await shopWithCatalog(t);
    const p = await addProduct(
      owner,
      accessoryBody(accessories.id, "Legacy item", { barcodes: ["LEG-1"] }),
    );
    // Rows as they could exist before the rule: same product, same code in another case.
    for (const value of ["leg-1", "old-2"]) {
      await t.tenantSql(
        tenantId,
        "insert into product_barcodes (tenant_id, product_id, value, kind) values ($1, $2, $3, 'manufacturer')",
        [tenantId, p.id, value],
      );
    }
    const file = join(process.cwd(), "drizzle", "0005_s1c_followups.sql");
    const steps = readFileSync(file, "utf8").split("--> statement-breakpoint");
    await t.db.execute(sql.raw(steps.slice(1).join(";\n")));

    const fresh = (await owner.get(`/products/${p.id}`)).json<{ product: Product }>().product;
    expect(
      fresh.barcodes
        .filter((b) => b.active)
        .map((b) => b.value)
        .sort(),
    ).toEqual(["LEG-1", "OLD-2"]);
    expect(fresh.barcodes.filter((b) => !b.active).map((b) => b.value)).toEqual(["LEG-1"]);
  });
});
