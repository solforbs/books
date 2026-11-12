import type { Product, StockResponse } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct } from "../../catalog/__tests__/catalog-fixtures";
import { addPeriod, kenyaDate } from "../domain/due-date";
import {
  deliveryBody,
  errorOf,
  imei,
  line,
  receive,
  receivingShop,
  type ReceivingShop,
} from "./receiving-fixtures";

/** F04 section 10 T1, T3, T7 and the pack unit conversion (F04a plan). */
describe("receiving stock: the basic delivery (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
  });
  afterAll(() => t.close());

  const stock = async () =>
    expectStatus(await s.owner.get("/stock"), 200).json<StockResponse>().rows;
  const sums = (account: string) =>
    t.tenantSql<{ total: string }>(
      s.tenantId,
      "select coalesce(sum(amount_kes_cents), 0)::text as total from ledger_lines where account = $1",
      [account],
    );

  it("T1: a credit delivery adds stock, owes the supplier and sets the due date", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(s, [
        line(s.charger.id, 50, 2_250_000),
        line(s.phone.id, 3, 28_500_000, {
          units: [imei(1), imei(2), imei(3)].map((n) => ({ imei: n })),
        }),
      ]),
    );
    expect(d).toMatchObject({
      number: 1,
      knownTotalCents: 30_750_000,
      paidCents: 0,
      owedCents: 30_750_000,
      pendingCostLines: 0,
      incompleteUnits: 0,
      paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
      supplier: { id: s.supplier.id, name: "Mombasa Traders" },
      location: { id: s.shop.id },
    });
    expect(d.dueDate).toBe(addPeriod(kenyaDate(new Date()), { value: 1, unit: "months" }));
    expect(d.lines[1]!.units.map((u) => u.status)).toEqual(["in_stock", "in_stock", "in_stock"]);

    const rows = await stock();
    expect(rows.find((r) => r.productId === s.charger.id)).toMatchObject({
      onHand: 50,
      valueCents: 2_250_000,
      costMissing: 0,
    });
    expect(rows.find((r) => r.productId === s.phone.id)).toMatchObject({
      onHand: 3,
      valueCents: 28_500_000,
    });
    // The books: stock value up, the supplier owed the same amount.
    expect((await sums("inventory"))[0]!.total).toBe("30750000");
    expect((await sums("supplier_payable"))[0]!.total).toBe("-30750000");
    // The supplier now has a balance, so it can no longer be hidden (F03 section 9.8).
    const hide = await s.owner.post(`/suppliers/${s.supplier.id}/hide`);
    expect(hide.statusCode).toBe(409);
    expect(errorOf(hide).code).toBe("supplier_has_balance");
  });

  it("T3: the line total is the cost; the cost of each piece is calculated from it", async () => {
    const d = await receive(s.owner, deliveryBody(s, [line(s.earphones.id, 20, 900_000)]));
    expect(d.lines[0]).toMatchObject({ pieces: 20, lineTotalCents: 900_000, costState: "known" });
    const row = (await stock()).find((r) => r.productId === s.earphones.id)!;
    expect(row.valueCents).toBe(900_000); // 20 x 450.00
  });

  it("splits a total that does not divide evenly without losing a cent", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(s, [
        line(s.phone.id, 3, 1_000_001, {
          units: [imei(11), imei(12), imei(13)].map((n) => ({ imei: n })),
        }),
      ]),
    );
    const costs = await t.tenantSql<{ cost_cents: string }>(
      s.tenantId,
      "select cost_cents::text from stock_units where layer_id = (select layer_id from delivery_lines where id = $1) order by cost_cents desc",
      [d.lines[0]!.id],
    );
    expect(costs.map((c) => Number(c.cost_cents))).toEqual([333_334, 333_334, 333_333]);
  });

  it("T7: a line without a total is price pending: stock goes up, nothing is booked", async () => {
    const before = (await sums("inventory"))[0]!.total;
    const d = await receive(s.owner, deliveryBody(s, [line(s.charger.id, 10)]));
    expect(d.lines[0]).toMatchObject({ lineTotalCents: null, costState: "pending" });
    expect(d).toMatchObject({ pendingCostLines: 1, knownTotalCents: 0, owedCents: 0 });
    expect((await sums("inventory"))[0]!.total).toBe(before);
    const row = (await stock()).find((r) => r.productId === s.charger.id)!;
    expect(row.costMissing).toBe(10);
    expect(row.onHand).toBe(60); // 50 from T1 plus these 10
  });

  it("converts a pack unit to pieces", async () => {
    const withBox = (
      await s.owner.post(`/products/${s.earphones.id}/packs`, { name: "Box", size: 12 })
    ).json<{ product: Product }>().product;
    const box = withBox.packUnits[0]!;
    const d = await receive(
      s.owner,
      deliveryBody(s, [line(s.earphones.id, 3, 3_600_000, { packUnitId: box.id })]),
    );
    expect(d.lines[0]).toMatchObject({
      quantity: 3,
      pieces: 36,
      packUnit: { id: box.id, name: "Box", size: 12 },
    });
    const bad = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.charger.id, 1, 100, { packUnitId: box.id })]),
    );
    expect(bad.statusCode).toBe(400);
    expect(errorOf(bad).code).toBe("invalid_pack_unit");
  });

  it("numbers deliveries 1, 2, 3 and lists them newest first with a cursor", async () => {
    const first = expectStatus(await s.owner.get("/deliveries?limit=2"), 200).json<{
      deliveries: { number: number }[];
      nextCursor: string | null;
    }>();
    expect(first.deliveries.length).toBe(2);
    expect(first.deliveries[0]!.number).toBeGreaterThan(first.deliveries[1]!.number);
    expect(first.nextCursor).not.toBeNull();
    const next = expectStatus(
      await s.owner.get(`/deliveries?limit=100&cursor=${first.nextCursor}`),
      200,
    ).json<{ deliveries: { number: number }[] }>();
    expect(next.deliveries.every((d) => d.number < first.deliveries[1]!.number)).toBe(true);
    const bad = await s.owner.get("/deliveries?cursor=garbage");
    expect(bad.statusCode).toBe(400);
    expect(errorOf(bad).code).toBe("invalid_cursor");
  });

  it("refuses a hidden product, an unknown supplier and an unknown location", async () => {
    // A product that has stock cannot be hidden (the catalog asks the inventory).
    const inUse = await s.owner.post(`/products/${s.charger.id}/hide`);
    expect(inUse.statusCode).toBe(409);
    const spare = await addProduct(s.owner, accessoryBody(s.accessories.id, "Spare Cable"));
    expectStatus(await s.owner.post(`/products/${spare.id}/hide`), 200);
    const hiddenProduct = await s.owner.post("/deliveries", deliveryBody(s, [line(spare.id, 1)]));
    expect(hiddenProduct.statusCode).toBe(400);
    expect(errorOf(hiddenProduct).code).toBe("product_not_receivable");
    const waitingLess = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.charger.id, 1)], { supplierId: s.shop.id }),
    );
    expect(waitingLess.statusCode).toBe(400);
    expect(errorOf(waitingLess).code).toBe("supplier_not_found");
    const badLocation = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.charger.id, 1)], { locationId: s.supplier.id }),
    );
    expect(badLocation.statusCode).toBe(400);
    expect(errorOf(badLocation).code).toBe("location_not_found");
  });

  it("refuses a supplier paid in US dollars (F04b)", async () => {
    const usd = (
      await s.owner.post("/suppliers", {
        name: "Dubai Gadgets",
        phone: "+971501234567",
        paymentRule: { type: "cash" },
        currency: "USD",
      })
    ).json<{ supplier: { id: string } }>().supplier;
    const res = await s.owner.post(
      "/deliveries",
      deliveryBody(s, [line(s.charger.id, 1, 100)], { supplierId: usd.id }),
    );
    expect(res.statusCode).toBe(400);
    expect(errorOf(res).code).toBe("supplier_currency_not_supported");
  });
});
