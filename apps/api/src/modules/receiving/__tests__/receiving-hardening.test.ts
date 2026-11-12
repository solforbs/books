import { randomUUID } from "node:crypto";
import type { Product, StockResponse } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { toErrorResult } from "../../../common/errors/to-error-body";
import { unitShare, splitCost } from "../../inventory/domain/cost-split";
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

/** Security review fixes: bounded work and locks, hidden money, drawer races (F04a). */
describe("receiving stock: limits, locks and hidden money (F04a review)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  let manager: TestClient; // no see_cost_profit
  let payer: TestClient; // cashier switched on for costs and paying
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
    manager = (await staffAt(t, s, "manager")).client;
    payer = (await staffAt(t, s, "cashier", { see_cost_profit: true, pay_suppliers: true })).client;
  });
  afterAll(() => t.close());

  const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => imei(from + i));

  it("a 5,000-unit line is saved in one request, with exact unit costs", async () => {
    const numbers = range(10_000, 5_000);
    const d = await receive(
      s.owner,
      deliveryBody(s, [
        line(s.phone.id, 5_000, 5_000_007, { units: numbers.map((n) => ({ imei: n })) }),
      ]),
    );
    expect(d.lines[0]!.units).toHaveLength(5_000);
    const sum = await t.tenantSql<{ n: string; c: string }>(
      s.tenantId,
      "select count(*)::text as n, sum(cost_cents)::text as c from stock_units",
    );
    expect(sum[0]).toEqual({ n: "5000", c: "5000007" });
    const row = (await s.owner.get("/stock")).json<StockResponse>().rows[0]!;
    expect(row.onHand).toBe(5_000);
    // And the same numbers again are refused as in stock, without one lock per IMEI.
    const again = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.phone.id, 5_000, 1, { units: numbers.map((n) => ({ imei: n })) })]),
    );
    expect(errorOf(again).code).toBe("imei_in_stock");
  });

  it("refuses more than 5,000 units per request (two lines of 3,000) and more than 1,000,000 pieces per line", async () => {
    const many = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [
        line(s.phone.id, 3_000, undefined, {
          units: range(30_000, 3_000).map((n) => ({ imei: n })),
        }),
        line(s.phone.id, 3_000, undefined, {
          units: range(40_000, 3_000).map((n) => ({ imei: n })),
        }),
      ]),
    );
    expect(many.statusCode).toBe(400);
    expect(errorOf(many).code).toBe("quantity_too_large");
    const huge = await s.owner.post("/deliveries", deliveryBody(s, [line(s.charger.id, 100_000)]));
    expect(huge.statusCode).toBe(201); // 100,000 pieces is allowed
    const pack = (
      await s.owner.post(`/products/${s.earphones.id}/packs`, { name: "Pallet", size: 50_000 })
    ).json<{ product: Product }>().product.packUnits[0]!;
    const overflow = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.earphones.id, 100_000, undefined, { packUnitId: pack.id })]),
    );
    expect(overflow.statusCode).toBe(400); // 5 billion pieces: never a 500
    expect(errorOf(overflow).code).toBe("quantity_too_large");
  });

  it("a number too big for the database is a 400, never a 500", () => {
    const result = toErrorResult(Object.assign(new Error("out of range"), { code: "22003" }));
    expect(result.status).toBe(400);
  });

  it("unit costs are calculated without building arrays", () => {
    for (const [total, pieces] of [
      [10, 3],
      [1_000_001, 3],
      [5, 9],
      [0, 4],
    ] as const) {
      const all = splitCost(total, pieces);
      expect(all.map((_, i) => unitShare(total, pieces, i))).toEqual(all);
    }
    expect(unitShare(1_000_000_000, 1_000_000, 999_999)).toBe(1_000);
  });

  it("without see_cost_profit the supplier balance and the drawer cash are not in the error", async () => {
    await receive(s.owner, deliveryBody(s, [line(s.charger.id, 1, 70_000)]));
    const hide = await manager.post(`/suppliers/${s.supplier.id}/hide`);
    expect(hide.statusCode).toBe(409);
    expect(errorOf(hide)).toMatchObject({ code: "supplier_has_balance" });
    expect(errorOf(hide).details).toBeUndefined();
    const owner = await s.owner.post(`/suppliers/${s.supplier.id}/hide`);
    expect(errorOf(owner).details).toEqual({ balance: expect.any(Number) });

    // A drawer below zero (owner overdraws), then a manager tries to close the shop.
    await receive(s.owner, {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 10_000 }],
    });
    const close = await manager.post(`/locations/${s.shop.id}/close`);
    expect(close.statusCode).toBe(409);
    expect(errorOf(close).code).toBe("location_not_empty");
    expect(errorOf(close).details).toEqual({ stockQuantity: expect.any(Number) });
    const asOwner = await s.owner.post(`/locations/${s.shop.id}/close`);
    expect(errorOf(asOwner).details).toMatchObject({ cashDrawerCents: -10_000 });
  });

  it("the shop name of an IMEI in stock is not told to someone who cannot see that shop", async () => {
    await receive(
      s.owner,
      deliveryBody(s, [line(s.phone.id, 1, undefined, { units: [{ imei: imei(900) }] })], {
        locationId: s.shop2.id,
      }),
    );
    const body = deliveryBody(s, [
      line(s.phone.id, 1, undefined, { units: [{ imei: imei(900) }] }),
    ]);
    const hidden = await manager.post("/deliveries", body);
    expect(hidden.statusCode).toBe(409);
    expect(errorOf(hidden)).toMatchObject({ code: "imei_in_stock", details: { imei: imei(900) } });
    expect(errorOf(hidden).details).toEqual({ imei: imei(900) });
    const owner = await s.owner.post("/deliveries", { ...body, commandId: randomUUID() });
    expect(errorOf(owner).details).toEqual({ imei: imei(900), locationName: "Shop 2" });
  });

  it("two payments from the same drawer at the same moment cannot both take the last cash", async () => {
    // Put 100.00 in the drawer through a balanced ledger entry (cash in is F07/F11).
    await t.tenantSql(
      s.tenantId,
      `with e as (insert into ledger_entries (tenant_id, type, created_by_user_id, source_type, source_id, command_id)
         values ($1, 'delivery', $2, 'test', gen_random_uuid(), 'test:cash-in') returning id)
       insert into ledger_lines (tenant_id, entry_id, account, money_place_id, amount_cents, amount_kes_cents)
       select $1, e.id, 'money_place', $3::uuid, 10000, 10000 from e
       union all
       select $1, e.id, 'inventory', null, -10000, -10000 from e`,
      [s.tenantId, s.ownerUserId, s.drawerId],
    );
    // The earlier owner overdraw left the drawer at -10,000; bring it to exactly 10,000.
    const balance = Number(
      (
        await t.tenantSql<{ b: string }>(
          s.tenantId,
          "select sum(amount_kes_cents)::text as b from ledger_lines where money_place_id = $1",
          [s.drawerId],
        )
      )[0]!.b,
    );
    if (balance < 10_000) {
      await t.tenantSql(
        s.tenantId,
        `with e as (insert into ledger_entries (tenant_id, type, created_by_user_id, source_type, source_id, command_id)
           values ($1, 'delivery', $2, 'test', gen_random_uuid(), 'test:cash-top-up') returning id)
         insert into ledger_lines (tenant_id, entry_id, account, money_place_id, amount_cents, amount_kes_cents)
         select $1, e.id, 'money_place', $3::uuid, $4::bigint, $4::bigint from e
         union all
         select $1, e.id, 'inventory', null, -$4::bigint, -$4::bigint from e`,
        [s.tenantId, s.ownerUserId, s.drawerId, 10_000 - balance],
      );
    }
    const pay = () =>
      payer.post("/deliveries", {
        ...deliveryBody(s, [line(s.charger.id, 1, 8_000)]),
        payments: [{ moneyPlaceId: s.drawerId, amountCents: 8_000 }],
      });
    const results = await Promise.all([pay(), pay(), pay()]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
    for (const r of results.filter((x) => x.statusCode === 409)) {
      expect(errorOf(r).code).toBe("insufficient_funds");
    }
  });
});
