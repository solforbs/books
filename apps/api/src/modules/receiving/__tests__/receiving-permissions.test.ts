import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addStaff, firstLogin } from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
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
import type { Delivery, StockResponse } from "@books/shared";

/** F04 section 7 with the existing permission names, and the location scope of F02. */
describe("receiving stock: who may do what (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  let manager: TestClient;
  let managerCosts: TestClient;
  let cashier: TestClient;
  let cashierCosts: TestClient;
  let keeper: TestClient;
  let keeperPays: TestClient;
  let accountant: TestClient;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
    manager = (await staffAt(t, s, "manager")).client;
    managerCosts = (await staffAt(t, s, "manager", { see_cost_profit: true })).client;
    cashier = (await staffAt(t, s, "cashier")).client;
    cashierCosts = (await staffAt(t, s, "cashier", { see_cost_profit: true })).client;
    keeper = (await staffAt(t, s, "storekeeper")).client;
    keeperPays = (await staffAt(t, s, "storekeeper", { pay_suppliers: true })).client;
    accountant = (await staffAt(t, s, "accountant")).client;
  });
  afterAll(() => t.close());

  const status = async (client: TestClient, body: object) =>
    (await client.post("/deliveries", body)).statusCode;
  const pending = () => deliveryBody(s, [line(s.charger.id, 1)]);
  const priced = () => deliveryBody(s, [line(s.charger.id, 1, 1_000)]);
  const paid = () => ({
    ...priced(),
    payments: [{ moneyPlaceId: s.drawerId, amountCents: 100 }],
  });

  it("receiving stock needs receive_stock: everyone but the accountant, who only reads", async () => {
    for (const client of [s.owner, manager, cashier, keeper]) {
      expect(await status(client, pending())).toBe(201);
    }
    expect(await status(accountant, pending())).toBe(403);
    const off = await staffAt(t, s, "cashier", { receive_stock: false });
    expect(await status(off.client, pending())).toBe(403);
    expect(await off.client.get("/deliveries")).toMatchObject({ statusCode: 403 });
  });

  it("totals need see_cost_profit: without it every line must be price pending (403 forbidden)", async () => {
    expect(await status(s.owner, priced())).toBe(201);
    for (const client of [manager, cashier, keeper]) {
      const res = await client.post("/deliveries", priced());
      expect(res.statusCode).toBe(403);
      expect(errorOf(res).code).toBe("forbidden");
    }
    expect(await status(managerCosts, priced())).toBe(201);
    expect(await status(cashierCosts, priced())).toBe(201);
  });

  it("paying needs pay_suppliers AND see_cost_profit", async () => {
    expect(await status(s.owner, paid())).toBe(201);
    expect(await status(managerCosts, paid())).toBe(201); // managers pay by default
    expect(await status(manager, paid())).toBe(403); // no costs
    expect(await status(cashierCosts, paid())).toBe(403); // cashiers do not pay by default
    expect(await status(keeperPays, paid())).toBe(403); // pays but cannot see costs
  });

  it("without see_cost_profit every money field is null; with it they are numbers", async () => {
    const d = await receive(s.owner, {
      ...deliveryBody(s, [line(s.charger.id, 5, 5_000)]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 1_000 }],
    });
    const asKeeper = (await keeper.get(`/deliveries/${d.id}`)).json<{ delivery: Delivery }>()
      .delivery;
    expect(asKeeper).toMatchObject({
      knownTotalCents: null,
      paidCents: null,
      owedCents: null,
      dueDate: null,
      payments: [],
      warnings: [],
    });
    expect(asKeeper.lines[0]).toMatchObject({ lineTotalCents: null, pieces: 5 });
    expect(asKeeper.pendingCostLines).toBe(0);
    const asCosts = (await cashierCosts.get(`/deliveries/${d.id}`)).json<{ delivery: Delivery }>()
      .delivery;
    expect(asCosts).toMatchObject({ knownTotalCents: 5_000, paidCents: 1_000, owedCents: 4_000 });
    const list = (await keeper.get("/deliveries")).json<{ deliveries: Delivery[] }>().deliveries;
    expect(list.every((x) => x.knownTotalCents === null && x.owedCents === null)).toBe(true);
  });

  it("stock: readable by receivers, product managers and report readers; value only with costs", async () => {
    const asKeeper = (await keeper.get("/stock")).json<StockResponse>();
    expect(asKeeper.rows.length).toBeGreaterThan(0);
    expect(asKeeper.rows.every((r) => r.valueCents === null)).toBe(true);
    const asAccountant = (await accountant.get("/stock")).json<StockResponse>();
    expect(asAccountant.rows.some((r) => r.valueCents !== null)).toBe(true);
    const none = await staffAt(t, s, "cashier", { receive_stock: false });
    expect((await none.client.get("/stock")).statusCode).toBe(403);
    expect((await none.client.get("/stock/lookup?number=123")).statusCode).toBe(403);
  });

  it("people limited to one location only see and use that location", async () => {
    const at2 = await receive(
      s.owner,
      deliveryBody(s, [line(s.charger.id, 2)], { locationId: s.shop2.id }),
    );
    const refused = await cashier.post("/deliveries", {
      ...pending(),
      locationId: s.shop2.id,
    });
    expect(refused.statusCode).toBe(400);
    expect(errorOf(refused).code).toBe("location_not_found");
    expect((await cashier.get(`/deliveries/${at2.id}`)).statusCode).toBe(404);
    const list = (await cashier.get("/deliveries?limit=100")).json<{ deliveries: Delivery[] }>()
      .deliveries;
    expect(list.some((d) => d.id === at2.id)).toBe(false);
    expect(list.length).toBeGreaterThan(0);
    const stock = (await cashier.get("/stock")).json<StockResponse>().rows;
    expect(stock.every((r) => r.locationId === s.shop.id)).toBe(true);
    // The same shop-2 delivery is visible to a person assigned there.
    const phone = randomPhone();
    const added = await addStaff(s.owner, {
      name: "Shop 2 keeper",
      phone,
      role: "storekeeper",
      locationIds: [s.shop2.id],
      permissions: {},
    });
    const there = await firstLogin(t, phone, added.temporaryPassword);
    expect((await there.get(`/deliveries/${at2.id}`)).statusCode).toBe(200);
  });
});
