import { randomUUID } from "node:crypto";
import type { Delivery } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { pgErrorCode } from "../../../common/database/pg-errors";
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

/** Entering costs afterwards and completing IMEIs afterwards (F04a plan points 4 and 5). */
describe("receiving stock: costs and IMEIs added afterwards (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  let allowed: TestClient; // a storekeeper the owner switched on for costs
  let keeper: TestClient;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
    allowed = (await staffAt(t, s, "storekeeper", { see_cost_profit: true })).client;
    keeper = (await staffAt(t, s, "storekeeper")).client;
  });
  afterAll(() => t.close());

  const costs = (_id: string, lines: { lineId: string; lineTotalCents: number }[]) => ({
    commandId: randomUUID(),
    lines,
  });
  const sum = async (account: string) =>
    Number(
      (
        await t.tenantSql<{ n: string }>(
          s.tenantId,
          "select coalesce(sum(amount_kes_cents), 0)::text as n from ledger_lines where account = $1",
          [account],
        )
      )[0]!.n,
    );
  const unitCosts = async (lineId: string) =>
    (
      await t.tenantSql<{ c: string | null }>(
        s.tenantId,
        "select cost_cents::text as c from stock_units where layer_id = (select layer_id from delivery_lines where id = $1) order by cost_cents desc nulls last",
        [lineId],
      )
    ).map((r) => (r.c === null ? null : Number(r.c)));

  it("T7: the owner enters a pending cost: stock value, supplier debt and the delivery follow", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(s, [
        line(s.earphones.id, 10),
        line(s.phone.id, 3, undefined, {
          units: [imei(300), imei(301), imei(302)].map((n) => ({ imei: n })),
        }),
      ]),
    );
    expect(d).toMatchObject({ pendingCostLines: 2, knownTotalCents: 0 });
    const inventory = await sum("inventory");

    const res = await s.owner.post(
      `/deliveries/${d.id}/costs`,
      costs(d.id, [
        { lineId: d.lines[0]!.id, lineTotalCents: 300_000 },
        { lineId: d.lines[1]!.id, lineTotalCents: 1_000_000 },
      ]),
    );
    expect(res.statusCode).toBe(200);
    const after = res.json<{ delivery: Delivery }>().delivery;
    expect(after).toMatchObject({
      pendingCostLines: 0,
      knownTotalCents: 1_300_000,
      owedCents: 1_300_000,
    });
    expect(after.lines.map((l) => l.costState)).toEqual(["known", "known"]);
    expect((await sum("inventory")) - inventory).toBe(1_300_000);
    expect(await unitCosts(d.lines[1]!.id)).toEqual([333_334, 333_333, 333_333]);
    const row = (await s.owner.get("/stock"))
      .json<{ rows: { productId: string; costMissing: number; valueCents: number }[] }>()
      .rows.find((r) => r.productId === s.earphones.id)!;
    expect(row).toMatchObject({ costMissing: 0, valueCents: 300_000 });
  });

  it("a cost can be entered once; unknown, foreign and repeated lines are refused", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(s, [line(s.charger.id, 4), line(s.earphones.id, 2)]),
    );
    const other = await receive(s.owner, deliveryBody(s, [line(s.charger.id, 1)]));
    const [a, b] = d.lines;
    expect(
      (
        await s.owner.post(
          `/deliveries/${d.id}/costs`,
          costs(d.id, [{ lineId: a!.id, lineTotalCents: 4_000 }]),
        )
      ).statusCode,
    ).toBe(200);

    const again = await s.owner.post(
      `/deliveries/${d.id}/costs`,
      costs(d.id, [{ lineId: a!.id, lineTotalCents: 5_000 }]),
    );
    expect(again.statusCode).toBe(409);
    expect(errorOf(again)).toMatchObject({
      code: "cost_already_known",
      details: { lineId: a!.id },
    });

    const foreign = await s.owner.post(
      `/deliveries/${d.id}/costs`,
      costs(d.id, [{ lineId: other.lines[0]!.id, lineTotalCents: 1 }]),
    );
    expect(foreign.statusCode).toBe(404);
    expect(errorOf(foreign).code).toBe("line_not_found");

    const twice = await s.owner.post(
      `/deliveries/${d.id}/costs`,
      costs(d.id, [
        { lineId: b!.id, lineTotalCents: 1 },
        { lineId: b!.id, lineTotalCents: 2 },
      ]),
    );
    expect(twice.statusCode).toBe(400);
    // The refused request changed nothing: the line b is still pending.
    const now = (await s.owner.get(`/deliveries/${d.id}`)).json<{ delivery: Delivery }>().delivery;
    expect(now.lines[1]!.costState).toBe("pending");
    const missing = await s.owner.post(
      `/deliveries/00000000-0000-4000-8000-000000000000/costs`,
      costs("x", [{ lineId: b!.id, lineTotalCents: 1 }]),
    );
    expect(errorOf(missing).code).toBe("delivery_not_found");
  });

  it("only the owner or someone the owner switched on can enter costs", async () => {
    const d = await receive(s.owner, deliveryBody(s, [line(s.charger.id, 2)]));
    const body = costs(d.id, [{ lineId: d.lines[0]!.id, lineTotalCents: 2_000 }]);
    expect((await keeper.post(`/deliveries/${d.id}/costs`, body)).statusCode).toBe(403);
    const manager = await staffAt(t, s, "manager"); // managers hold no see_cost_profit by default
    expect((await manager.client.post(`/deliveries/${d.id}/costs`, body)).statusCode).toBe(403);
    const ok = await allowed.post(`/deliveries/${d.id}/costs`, body);
    expect(ok.statusCode).toBe(200);
    // Replaying the same command returns the delivery and books nothing twice.
    const inventory = await sum("inventory");
    const replay = await allowed.post(`/deliveries/${d.id}/costs`, body);
    expect(replay.statusCode).toBe(200);
    expect(await sum("inventory")).toBe(inventory);
    const changed = await allowed.post(`/deliveries/${d.id}/costs`, {
      ...body,
      lines: [{ lineId: d.lines[0]!.id, lineTotalCents: 9 }],
    });
    expect(errorOf(changed).code).toBe("command_conflict");
  });

  it("the database refuses to change a cost that is already set (even for the table owner)", async () => {
    const d = await receive(s.owner, deliveryBody(s, [line(s.charger.id, 1, 700)]));
    const attempt = t.tenantSql(
      s.tenantId,
      "update stock_layers set cost_total_cents = 1 where id = (select layer_id from delivery_lines where id = $1)",
      [d.lines[0]!.id],
    );
    await expect(attempt.catch((e) => pgErrorCode(e))).resolves.toBe("23514");
  });

  it("T9: the missing IMEIs are added afterwards; the units get their share of the cost", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(
        s,
        [
          line(s.phone.id, 5, 500_001, {
            units: [imei(310), imei(311), imei(312)].map((n) => ({ imei: n })),
          }),
        ],
        { allowIncomplete: true },
      ),
    );
    expect(d.incompleteUnits).toBe(2);
    const res = await keeper.post(`/deliveries/${d.id}/units`, {
      commandId: randomUUID(),
      units: [imei(313), imei(314)].map((n) => ({ lineId: d.lines[0]!.id, imei: n })),
    });
    expect(res.statusCode).toBe(200);
    const after = res.json<{ delivery: Delivery }>().delivery;
    expect(after).toMatchObject({ incompleteUnits: 0 });
    expect(after.lines[0]).toMatchObject({ missingUnits: 0 });
    expect(after.lines[0]!.units).toHaveLength(5);
    // 500,001 over 5 pieces: one piece one cent more. The sum is the line total.
    const costs = await unitCosts(d.lines[0]!.id);
    expect(costs.reduce((a, c) => a! + c!, 0)).toBe(500_001);
    expect(costs).toEqual([100_001, 100_000, 100_000, 100_000, 100_000]);
    const moves = await t.tenantSql<{ n: string }>(
      s.tenantId,
      "select count(*)::text as n from stock_movements where type = 'unit_added'",
    );
    expect(Number(moves[0]!.n)).toBeGreaterThanOrEqual(5);
  });

  it("completing refuses too many units, taken IMEIs, quantity lines and foreign lines", async () => {
    const d = await receive(
      s.owner,
      deliveryBody(
        s,
        [line(s.phone.id, 3, undefined, { units: [{ imei: imei(320) }] }), line(s.charger.id, 1)],
        { allowIncomplete: true },
      ),
    );
    const post = (units: object[]) =>
      keeper.post(`/deliveries/${d.id}/units`, { commandId: randomUUID(), units });
    const phone = d.lines[0]!.id;

    const tooMany = await post(
      [imei(321), imei(322), imei(323)].map((n) => ({ lineId: phone, imei: n })),
    );
    expect(errorOf(tooMany)).toMatchObject({
      code: "imei_count_mismatch",
      details: { pieces: 2, units: 3 },
    });
    const taken = await post([{ lineId: phone, imei: imei(320) }]);
    expect(errorOf(taken).code).toBe("imei_in_stock");
    const dup = await post([
      { lineId: phone, imei: imei(324) },
      { lineId: phone, imei: imei(324) },
    ]);
    expect(errorOf(dup).code).toBe("duplicate_imei_in_delivery");
    const invalid = await post([{ lineId: phone, imei: "12345" }]);
    expect(errorOf(invalid).code).toBe("invalid_imei");
    const qty = await post([{ lineId: d.lines[1]!.id, imei: imei(325) }]);
    expect(errorOf(qty).code).toBe("units_not_allowed");
    const foreign = await post([{ lineId: randomUUID(), imei: imei(326) }]);
    expect(foreign.statusCode).toBe(404);
    expect(errorOf(foreign).code).toBe("line_not_found");
    // Nothing above changed the delivery.
    const now = (await s.owner.get(`/deliveries/${d.id}`)).json<{ delivery: Delivery }>().delivery;
    expect(now.incompleteUnits).toBe(2);
  });
});
