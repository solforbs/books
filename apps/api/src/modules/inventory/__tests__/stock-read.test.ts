import type { StockResponse, UnitLookupResponse } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import {
  deliveryBody,
  errorOf,
  imei,
  line,
  receive,
  receivingShop,
  type ReceivingShop,
} from "../../receiving/__tests__/receiving-fixtures";

describe("stock list, IMEI lookup and the closing rules (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
    await receive(
      s.owner,
      deliveryBody(s, [
        line(s.charger.id, 5, 5_000),
        line(s.earphones.id, 2, 2_000),
        line(s.phone.id, 1, 9_000, {
          units: [{ imei: imei(500), imei2: imei(501), serial: "SER-9" }],
        }),
      ]),
    );
    await receive(
      s.owner,
      deliveryBody(s, [line(s.charger.id, 3, 3_000)], { locationId: s.shop2.id }),
    );
  });
  afterAll(() => t.close());

  const stock = async (query = "") => (await s.owner.get(`/stock${query}`)).json<StockResponse>();

  it("lists one row per product and location, alphabetically, with filters", async () => {
    const all = await stock();
    expect(all.rows.map((r) => `${r.productName}@${r.locationName}`)).toEqual(
      [...all.rows.map((r) => `${r.productName}@${r.locationName}`)].sort(),
    );
    expect(
      all.rows
        .filter((r) => r.productId === s.charger.id)
        .map((r) => r.onHand)
        .sort(),
    ).toEqual([3, 5]);
    expect((await stock(`?locationId=${s.shop2.id}`)).rows).toHaveLength(1);
    expect((await stock("?q=earph")).rows.map((r) => r.productId)).toEqual([s.earphones.id]);
    expect((await stock(`?categoryId=${s.phones.id}`)).rows.map((r) => r.productId)).toEqual([
      s.phone.id,
    ]);
  });

  it("pages with a cursor and refuses a tampered one", async () => {
    const seen: string[] = [];
    let cursor = "";
    for (let i = 0; i < 10; i++) {
      const page = await stock(`?limit=1${cursor}`);
      seen.push(...page.rows.map((r) => `${r.productId}@${r.locationId}`));
      if (!page.nextCursor) break;
      cursor = `&cursor=${page.nextCursor}`;
    }
    expect(seen).toHaveLength(4);
    expect(new Set(seen).size).toBe(4);
    const bad = await s.owner.get("/stock?cursor=garbage");
    expect(errorOf(bad).code).toBe("invalid_cursor");
  });

  it("finds a unit by IMEI, second IMEI, serial, or a number typed with dashes", async () => {
    for (const n of [
      imei(500),
      imei(501),
      "SER-9",
      `${imei(500).slice(0, 8)}-${imei(500).slice(8)}`,
    ]) {
      const res = (
        await s.owner.get(`/stock/lookup?number=${encodeURIComponent(n)}`)
      ).json<UnitLookupResponse>();
      expect(res.units).toHaveLength(1);
      expect(res.units[0]).toMatchObject({
        status: "in_stock",
        deliveryNumber: 1,
        costCents: 9_000,
        location: { id: s.shop.id },
      });
    }
    expect(
      (await s.owner.get("/stock/lookup?number=999")).json<UnitLookupResponse>().units,
    ).toEqual([]);
  });

  it("a location holding stock cannot be closed; a product with stock cannot be merged", async () => {
    const close = await s.owner.post(`/locations/${s.shop2.id}/close`);
    expect(close.statusCode).toBe(409);
    expect(errorOf(close)).toMatchObject({
      code: "location_not_empty",
      details: { stockQuantity: 3 },
    });
    const merge = await s.owner.post(`/products/${s.charger.id}/merge`, {
      intoProductId: s.earphones.id,
    });
    expect(merge.statusCode).toBe(409);
    expect(errorOf(merge).code).toBe("product_in_use");
  });
});
