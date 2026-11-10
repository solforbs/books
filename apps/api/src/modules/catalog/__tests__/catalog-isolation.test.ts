import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Product, ProductsResponse } from "@books/shared";
import { createLocation, expectStatus } from "../../../../test/business-fixtures";
import { pgUrl } from "../../../../test/pg";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { pgErrorCode } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { ProductsRepository } from "../infrastructure/products.repository";
import { products } from "../infrastructure/tables/products.table";
import { accessoryBody, addProduct, shopWithCatalog, type Catalog } from "./catalog-fixtures";

const TABLES = [
  "product_categories",
  "products",
  "product_pack_units",
  "product_barcodes",
  "product_location_prices",
  "product_history",
  "barcode_sequences",
];

/** House rule 5: business A can never reach business B's catalog. */
describe("the catalog is isolated per business", () => {
  let t: TestApp;
  let a: Catalog;
  let b: Catalog;
  let productA: Product;
  let productB: Product;
  let app: Pool;
  beforeAll(async () => {
    t = await createTestApp();
    a = await shopWithCatalog(t);
    b = await shopWithCatalog(t);
    // Touch every table in both businesses.
    for (const shop of [a, b]) {
      const product = await addProduct(
        shop.owner,
        accessoryBody(shop.accessories.id, "Shared name", {
          packUnits: [{ name: "Box", size: 10 }],
          barcodes: ["5551234567890"],
        }),
      );
      await shop.owner.post(`/products/${product.id}/barcodes/generate`, {});
      await shop.owner.patch(`/products/${product.id}`, {
        locationPrices: [{ locationId: shop.shop.id, retailPrice: 99 }],
      });
      if (shop === a) productA = product;
      else productB = product;
    }
    app = new Pool({ connectionString: pgUrl("app", t.database), max: 1 });
  });
  afterAll(async () => {
    await app.end();
    await t.close();
  });

  it("the same name and the same barcode may exist in two businesses", () => {
    expect(productA.name).toBe(productB.name);
    expect(productA.id).not.toBe(productB.id);
  });

  it("another business's product, history and actions answer 404", async () => {
    for (const res of [
      await a.owner.get(`/products/${productB.id}`),
      await a.owner.get(`/products/${productB.id}/history`),
      await a.owner.patch(`/products/${productB.id}`, { name: "Hacked" }),
      await a.owner.post(`/products/${productB.id}/hide`),
      await a.owner.post(`/products/${productB.id}/barcodes/generate`, {}),
      await a.owner.post(`/products/${productB.id}/packs`, { name: "Crate", size: 5 }),
    ]) {
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("product_not_found");
    }
    expect(
      (await a.owner.get("/products")).json<ProductsResponse>().products.map((p) => p.id),
    ).toEqual([productA.id]);
    const own = (await b.owner.get(`/products/${productB.id}`)).json<{ product: Product }>()
      .product;
    expect(own.name).toBe("Shared name");
  });

  it("cannot use another business's category or location", async () => {
    const res = await a.owner.post("/products", accessoryBody(b.accessories.id, "Cross category"));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("category_not_found");
    expect(
      (await a.owner.patch(`/product-categories/${b.accessories.id}`, { name: "Mine" })).statusCode,
    ).toBe(404);
    const place = await a.owner.patch(`/products/${productA.id}`, {
      locationPrices: [{ locationId: b.shop.id, retailPrice: 5 }],
    });
    expect(place.statusCode).toBe(400);
    expect(place.json().error.code).toBe("location_not_found");
    const lists = (await a.owner.get("/product-categories")).json<{
      categories: { id: string }[];
    }>();
    expect(lists.categories.map((c) => c.id)).not.toContain(b.accessories.id);
  });

  it("cannot merge into another business's product or move barcodes across", async () => {
    const res = await a.owner.post(`/products/${productA.id}/merge`, {
      intoProductId: productB.id,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.details.reason).toBe("not_found");
    const scan = (
      await a.owner.get("/products/lookup?barcode=5551234567890")
    ).json<ProductsResponse>();
    expect(scan.products.map((p) => p.id)).toEqual([productA.id]);
  });

  it("the repository never returns another business's rows", async () => {
    const repo = t.app.get(ProductsRepository);
    expect(await repo.findById(a.tenantId, productB.id)).toBeNull();
    expect(await repo.updateById(a.tenantId, productB.id, { name: "hacked" })).toBe(0);
  });

  it("row-level security hides every catalog table from a query with no tenant filter", async () => {
    const rows = await t.app
      .get(TenantDb)
      .transaction(a.tenantId, async ({ tx }) => tx.select().from(products));
    expect(rows.map((r) => r.id)).toEqual([productA.id]);
    for (const table of TABLES) {
      const { rows: none } = await app.query(`select * from ${table}`);
      expect(none, `${table} without a business`).toEqual([]);
      const client = await app.connect();
      try {
        await client.query("begin");
        await client.query("select set_config('app.tenant_id', $1, true)", [a.tenantId]);
        const { rows: mine } = await client.query(`select tenant_id from ${table}`);
        await client.query("rollback");
        expect(mine.length, `${table} sees A`).toBeGreaterThan(0);
        expect(new Set(mine.map((r) => r.tenant_id)), `${table} only A`).toEqual(
          new Set([a.tenantId]),
        );
      } finally {
        client.release();
      }
    }
  });

  it("composite foreign keys stop a row from pointing at another business's rows", async () => {
    const asA = async (text: string, params: unknown[]) => {
      const client = await app.connect();
      try {
        await client.query("begin");
        await client.query("select set_config('app.tenant_id', $1, true)", [a.tenantId]);
        await client.query(text, params);
        await client.query("commit");
        return "no error";
      } catch (err) {
        await client.query("rollback");
        return pgErrorCode(err);
      } finally {
        client.release();
      }
    };
    const second = await createLocation(b.owner, { name: "B2", type: "shop" });
    // A product of A in B's category.
    expect(
      await asA(
        "insert into products (tenant_id, category_id, name, name_key, tracking_type, duplicate_key, added_by_user_id) values ($1, $2, 'x', 'x', 'quantity', 'n:x', $3)",
        [a.tenantId, b.accessories.id, a.ownerUserId],
      ),
    ).toBe("23503");
    // A pack, a barcode, a history row and a location price pointing at B's product.
    expect(
      await asA(
        "insert into product_pack_units (tenant_id, product_id, name, size) values ($1, $2, 'Box', 5)",
        [a.tenantId, productB.id],
      ),
    ).toBe("23503");
    expect(
      await asA(
        "insert into product_barcodes (tenant_id, product_id, value, kind) values ($1, $2, '1234567', 'manufacturer')",
        [a.tenantId, productB.id],
      ),
    ).toBe("23503");
    expect(
      await asA(
        "insert into product_history (tenant_id, product_id, by_user_id, action) values ($1, $2, $3, 'x')",
        [a.tenantId, productB.id, a.ownerUserId],
      ),
    ).toBe("23503");
    expect(
      await asA(
        "insert into product_location_prices (tenant_id, product_id, location_id) values ($1, $2, $3)",
        [a.tenantId, productA.id, second.id],
      ),
    ).toBe("23503");
    // Row-level security refuses a row stamped with another business.
    expect(
      await asA(
        "insert into product_categories (tenant_id, name, name_key, default_tracking, naming_mode) values ($1, 'X', 'x', 'quantity', 'free')",
        [b.tenantId],
      ),
    ).toBe("42501");
  });

  it("nothing can be deleted or rewritten behind the history's back (G4)", async () => {
    const asA = async (text: string) => {
      const client = await app.connect();
      try {
        await client.query("begin");
        await client.query("select set_config('app.tenant_id', $1, true)", [a.tenantId]);
        await client.query(text);
        await client.query("rollback");
        return "no error";
      } catch (err) {
        await client.query("rollback");
        return pgErrorCode(err);
      } finally {
        client.release();
      }
    };
    for (const table of TABLES)
      expect(await asA(`delete from ${table}`), `${table} delete`).toBe("42501");
    expect(await asA("update product_history set action = 'x'")).toBe("42501");
    expect(expectStatus(await a.owner.get("/products"), 200).statusCode).toBe(200);
  });
});
