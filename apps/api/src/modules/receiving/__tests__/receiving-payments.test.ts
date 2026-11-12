import type { Delivery, MoneyPlace } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import {
  deliveryBody,
  errorOf,
  line,
  receive,
  receivingShop,
  staffAt,
  type ReceivingShop,
} from "./receiving-fixtures";

/** Paying at delivery (F04 sections 3, 7 and 9.7): who may, from where, and what happens. */
describe("receiving stock: paying at delivery (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  let till: MoneyPlace;
  let bank2: MoneyPlace;
  let payer: TestClient; // a cashier switched on for costs and paying
  let manager: TestClient; // a manager switched on for costs (paying is a manager default)
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
    const create = async (body: Record<string, unknown>) =>
      expectStatus(await s.owner.post("/money-places", body), 201).json<{
        moneyPlace: MoneyPlace;
      }>().moneyPlace;
    till = await create({
      type: "mpesa_till",
      name: "Till",
      number: "123456",
      locationIds: [s.shop.id],
    });
    bank2 = await create({ type: "bank", name: "Equity", locationIds: [s.shop2.id] });
    payer = (await staffAt(t, s, "cashier", { see_cost_profit: true, pay_suppliers: true })).client;
    manager = (await staffAt(t, s, "manager", { see_cost_profit: true })).client;
  });
  afterAll(() => t.close());

  const balance = async (moneyPlaceId: string) =>
    Number(
      (
        await t.tenantSql<{ total: string }>(
          s.tenantId,
          "select coalesce(sum(amount_kes_cents), 0)::text as total from ledger_lines where money_place_id = $1",
          [moneyPlaceId],
        )
      )[0]!.total,
    );
  const owed = async () =>
    Number(
      (
        await t.tenantSql<{ total: string }>(
          s.tenantId,
          "select coalesce(-sum(amount_kes_cents), 0)::text as total from ledger_lines where account = 'supplier_payable' and supplier_id = $1",
          [s.supplier.id],
        )
      )[0]!.total,
    );

  it("part paid from a till: the rest is owed, the till goes down, both in the books", async () => {
    const before = await owed();
    const d = await receive(s.owner, {
      ...deliveryBody(s, [line(s.charger.id, 10, 1_000_000)]),
      payments: [{ moneyPlaceId: till.id, amountCents: 400_000 }],
    });
    expect(d).toMatchObject({ knownTotalCents: 1_000_000, paidCents: 400_000, owedCents: 600_000 });
    expect(d.payments).toEqual([
      { moneyPlace: { id: till.id, name: "Till" }, amountCents: 400_000 },
    ]);
    expect(d.warnings).toEqual([]);
    expect(await balance(till.id)).toBe(-400_000);
    expect((await owed()) - before).toBe(600_000);
  });

  it("fully paid: nothing is owed to the supplier", async () => {
    const before = await owed();
    const d = await receive(s.owner, {
      ...deliveryBody(s, [line(s.charger.id, 1, 50_000)]),
      payments: [{ moneyPlaceId: till.id, amountCents: 50_000 }],
    });
    expect(d.owedCents).toBe(0);
    expect(await owed()).toBe(before);
  });

  it("refuses paying more than the known total, and any payment for a price-pending line", async () => {
    const over = await s.owner.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 50_000)]),
      payments: [{ moneyPlaceId: till.id, amountCents: 50_001 }],
    });
    expect(over.statusCode).toBe(400);
    expect(errorOf(over)).toMatchObject({
      code: "payment_exceeds_total",
      details: { totalCents: 50_000, paidCents: 50_001 },
    });
    const pending = await s.owner.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1)]),
      payments: [{ moneyPlaceId: till.id, amountCents: 100 }],
    });
    expect(errorOf(pending).code).toBe("payment_exceeds_total");
  });

  it("an owner can overdraw a cash drawer: it is saved with a warning that stays on the delivery", async () => {
    const d = await receive(s.owner, {
      ...deliveryBody(s, [line(s.charger.id, 2, 20_000)]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 20_000 }],
    });
    expect(d.warnings).toEqual([{ type: "drawer_negative", moneyPlaceId: s.drawerId }]);
    const again = expectStatus(await s.owner.get(`/deliveries/${d.id}`), 200).json<{
      delivery: Delivery;
    }>().delivery;
    expect(again.warnings).toEqual(d.warnings);
    expect(await balance(s.drawerId)).toBe(-20_000);
    // A drawer below zero blocks closing its location (the probe reads the ledger).
    const close = await s.owner.post(`/locations/${s.shop.id}/close`);
    expect(close.statusCode).toBe(409);
    expect(errorOf(close)).toMatchObject({
      code: "location_not_empty",
      details: { cashDrawerCents: -20_000 },
    });
  });

  it("a manager may overdraw a drawer too; a cashier may not (409 insufficient_funds)", async () => {
    const ok = await manager.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 10_000 }],
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json<{ delivery: Delivery }>().delivery.warnings).toHaveLength(1);

    const refused = await payer.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 10_000 }],
    });
    expect(refused.statusCode).toBe(409);
    expect(errorOf(refused)).toMatchObject({
      code: "insufficient_funds",
      details: { moneyPlaceId: s.drawerId },
    });
    // Nothing was saved or booked by the refused request.
    expect(await balance(s.drawerId)).toBe(-30_000);
  });

  it("two payments from the same drawer are added up before the drawer check", async () => {
    const res = await payer.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [
        { moneyPlaceId: till.id, amountCents: 1_000 },
        { moneyPlaceId: s.drawerId, amountCents: 4_000 },
        { moneyPlaceId: s.drawerId, amountCents: 5_000 },
      ],
    });
    expect(errorOf(res).code).toBe("insufficient_funds");
  });

  it("a money place the person may not use is not found (other location, unknown id)", async () => {
    const other = await payer.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: bank2.id, amountCents: 100 }],
    });
    expect(other.statusCode).toBe(400);
    expect(errorOf(other)).toMatchObject({
      code: "money_place_not_found",
      details: { moneyPlaceId: bank2.id },
    });
    // The owner can use it (every place) even though it belongs to Shop 2.
    const owner = await s.owner.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: bank2.id, amountCents: 100 }],
    });
    expect(owner.statusCode).toBe(201);
    const unknown = await s.owner.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1, 10_000)]),
      payments: [{ moneyPlaceId: "00000000-0000-4000-8000-000000000000", amountCents: 100 }],
    });
    expect(errorOf(unknown).code).toBe("money_place_not_found");
  });

  it("a money place with a balance cannot be hidden: the probe reads the ledger", async () => {
    const res = await s.owner.patch(`/money-places/${till.id}`, { hidden: true });
    expect(res.statusCode).toBe(409);
    expect(errorOf(res).code).toBe("money_place_not_empty");
  });
});
