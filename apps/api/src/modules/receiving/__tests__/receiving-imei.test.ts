import type { StockResponse } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { addProduct, phoneBody } from "../../catalog/__tests__/catalog-fixtures";
import {
  deliveryBody,
  errorOf,
  imei,
  line,
  receive,
  receivingShop,
  staffAt,
  type ReceivingShop,
} from "./receiving-fixtures";

const units = (...numbers: string[]) => numbers.map((n) => ({ imei: n }));

/** F04 section 4.3 (IMEI rules) and F04 section 10 T8, T9. */
describe("receiving stock: IMEI rules (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
  });
  afterAll(() => t.close());

  const post = (body: ReturnType<typeof deliveryBody>) => s.owner.post("/deliveries", body);
  const phones = (n: number, ...numbers: string[]) =>
    line(s.phone.id, n, undefined, { units: units(...numbers) });

  it("rejects an invalid IMEI (wrong check digit, 14 digits) with the number in the details", async () => {
    const wrongCheck = imei(100).slice(0, 14) + String((Number(imei(100)[14]) + 1) % 10);
    for (const bad of [wrongCheck, imei(100).slice(0, 14), "abc"]) {
      const res = await post(deliveryBody(s, [phones(1, bad)]));
      expect(res.statusCode).toBe(400);
      expect(errorOf(res)).toMatchObject({ code: "invalid_imei", details: { value: bad } });
    }
  });

  it("cleans spaces and dashes, and stores the clean number", async () => {
    const n = imei(101);
    const dashed = `${n.slice(0, 2)}-${n.slice(2, 8)}-${n.slice(8, 14)}-${n[14]}`;
    const d = await receive(s.owner, deliveryBody(s, [phones(1, dashed)]));
    expect(d.lines[0]!.units[0]!.imei).toBe(n);
  });

  it("refuses the same IMEI twice in one delivery, also across lines and as second IMEI", async () => {
    const dup = await post(deliveryBody(s, [phones(2, imei(110), imei(110))]));
    expect(errorOf(dup)).toMatchObject({
      code: "duplicate_imei_in_delivery",
      details: { number: imei(110) },
    });
    const across = await post(deliveryBody(s, [phones(1, imei(111)), phones(1, imei(111))]));
    expect(errorOf(across).code).toBe("duplicate_imei_in_delivery");
    const second = await post(
      deliveryBody(s, [
        line(s.phone.id, 2, undefined, {
          units: [{ imei: imei(112), imei2: imei(113) }, { imei: imei(113) }],
        }),
      ]),
    );
    expect(errorOf(second).code).toBe("duplicate_imei_in_delivery");
  });

  it("T8: an IMEI already in stock anywhere in the business is blocked, naming the shop", async () => {
    const at2 = deliveryBody(s, [phones(1, imei(120))], { locationId: s.shop2.id });
    await receive(s.owner, at2);
    const res = await post(deliveryBody(s, [phones(1, imei(120))]));
    expect(res.statusCode).toBe(409);
    expect(errorOf(res)).toMatchObject({
      code: "imei_in_stock",
      details: { number: imei(120), locationName: "Shop 2", locationId: s.shop2.id },
    });
    // Also when it is the second IMEI of an existing phone.
    await receive(
      s.owner,
      deliveryBody(s, [
        line(s.phone.id, 1, undefined, { units: [{ imei: imei(121), imei2: imei(122) }] }),
      ]),
    );
    const viaSecond = await post(deliveryBody(s, [phones(1, imei(122))]));
    expect(errorOf(viaSecond).code).toBe("imei_in_stock");
  });

  it("T9: fewer IMEIs than pieces is refused unless saved as incomplete; 3 of 5 are sellable", async () => {
    const refused = await post(deliveryBody(s, [phones(5, imei(130), imei(131), imei(132))]));
    expect(refused.statusCode).toBe(400);
    expect(errorOf(refused)).toMatchObject({
      code: "imei_count_mismatch",
      details: { pieces: 5, units: 3 },
    });
    const d = await receive(
      s.owner,
      deliveryBody(s, [phones(5, imei(130), imei(131), imei(132))], { allowIncomplete: true }),
    );
    expect(d).toMatchObject({ incompleteUnits: 2 });
    expect(d.lines[0]).toMatchObject({ pieces: 5, missingUnits: 2 });
    expect(d.lines[0]!.units).toHaveLength(3);
    const rows = expectStatus(
      await s.owner.get(`/stock?locationId=${s.shop.id}`),
      200,
    ).json<StockResponse>().rows;
    const row = rows.find((r) => r.productId === s.phone.id)!;
    expect(row.incomplete).toBe(2);
    const inStock = await t.tenantSql<{ n: string }>(
      s.tenantId,
      "select count(*)::text as n from stock_units where location_id = $1 and product_id = $2 and status = $3",
      [s.shop.id, s.phone.id, "in_stock"],
    );
    expect(row.onHand).toBe(Number(inStock[0]!.n)); // stock is the count of its units
    const sellable = await t.tenantSql<{ n: string }>(
      s.tenantId,
      "select count(*)::text as n from stock_units where layer_id = (select layer_id from delivery_lines where id = $1) and status = 'in_stock'",
      [d.lines[0]!.id],
    );
    expect(sellable[0]!.n).toBe("3");
    // More IMEIs than pieces is never allowed, even as incomplete.
    const tooMany = await post(
      deliveryBody(s, [phones(1, imei(140), imei(141))], { allowIncomplete: true }),
    );
    expect(errorOf(tooMany).code).toBe("imei_count_mismatch");
  });

  it("an IMEI sold before needs an owner or manager to confirm it", async () => {
    await receive(s.owner, deliveryBody(s, [phones(1, imei(150))]));
    await t.tenantSql(s.tenantId, "update stock_units set status = 'sold' where imei = $1", [
      imei(150),
    ]);
    const plain = await post(deliveryBody(s, [phones(1, imei(150))]));
    expect(plain.statusCode).toBe(409);
    expect(errorOf(plain)).toMatchObject({
      code: "imei_sold_before",
      details: { number: imei(150), status: "sold" },
    });

    const cashier = await staffAt(t, s, "cashier");
    const refused = await cashier.client.post(
      "/deliveries",
      deliveryBody(s, [phones(1, imei(150))], { confirmSoldBefore: true }),
    );
    expect(errorOf(refused).code).toBe("imei_sold_before");

    const manager = await staffAt(t, s, "manager");
    const ok = await manager.client.post(
      "/deliveries",
      deliveryBody(s, [phones(1, imei(150))], { confirmSoldBefore: true }),
    );
    expect(ok.statusCode).toBe(201);
    const rows = await t.tenantSql<{ status: string }>(
      s.tenantId,
      "select status from stock_units where imei = $1 order by created_at",
      [imei(150)],
    );
    expect(rows.map((r) => r.status)).toEqual(["sold", "in_stock"]); // the phone is a second unit
    // Now it is in stock again: blocked, confirmation or not.
    const again = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [phones(1, imei(150))], { confirmSoldBefore: true }),
    );
    expect(errorOf(again).code).toBe("imei_in_stock");
  });

  it("quantity products take no units; serial products take a serial and no IMEI", async () => {
    const withUnits = await post(
      deliveryBody(s, [line(s.charger.id, 1, undefined, { units: [{ imei: imei(160) }] })]),
    );
    expect(errorOf(withUnits).code).toBe("units_not_allowed");

    const tablet = await addProduct(
      s.owner,
      phoneBody(s.phones.id, { model: "Tab X", trackingType: "serial" }),
    );
    const serial = (n: string) => line(tablet.id, 1, undefined, { units: [{ serial: n }] });
    const d = await receive(s.owner, deliveryBody(s, [serial("SN-0001")]));
    expect(d.lines[0]!.units[0]).toMatchObject({ serial: "SN-0001", imei: null });
    expect(errorOf(await post(deliveryBody(s, [serial("SN-0001")]))).code).toBe("imei_in_stock");
    const imeiOnSerial = await post(
      deliveryBody(s, [line(tablet.id, 1, undefined, { units: [{ imei: imei(161) }] })]),
    );
    expect(errorOf(imeiOnSerial).code).toBe("units_not_allowed");
    const missing = await post(deliveryBody(s, [line(tablet.id, 1, undefined, { units: [{}] })]));
    expect(errorOf(missing).code).toBe("invalid_imei");
  });

  it("two deliveries with the same IMEI at the same moment: exactly one is saved", async () => {
    const results = await Promise.all(
      [0, 1, 2].map(() => post(deliveryBody(s, [phones(1, imei(170))]))),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
    for (const r of results.filter((x) => x.statusCode === 409)) {
      expect(errorOf(r).code).toBe("imei_in_stock");
    }
  });
});
