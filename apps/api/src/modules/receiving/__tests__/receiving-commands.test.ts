import { randomUUID } from "node:crypto";
import type { Delivery } from "@books/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../../../../test/test-app";
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

/** Safe repeats (G6, F04a plan point 7): the same commandId never creates a second delivery. */
describe("receiving stock: repeating a command (F04a)", () => {
  let t: TestApp;
  let s: ReceivingShop;
  beforeAll(async () => {
    t = await createTestApp();
    s = await receivingShop(t);
  });
  afterAll(() => t.close());

  const count = async (sql: string) =>
    Number((await t.tenantSql<{ n: string }>(s.tenantId, sql))[0]!.n);

  it("the same commandId and body twice: the first delivery comes back (200), nothing is doubled", async () => {
    const body = {
      ...deliveryBody(s, [
        line(s.charger.id, 5, 250_000),
        line(s.phone.id, 1, 900_000, { units: [{ imei: imei(200) }] }),
      ]),
      payments: [{ moneyPlaceId: s.drawerId, amountCents: 50_000 }],
    };
    const first = await s.owner.post("/deliveries", body);
    expect(first.statusCode).toBe(201);
    const second = await s.owner.post("/deliveries", body);
    expect(second.statusCode).toBe(200);
    expect(second.json<{ delivery: Delivery }>().delivery.id).toBe(
      first.json<{ delivery: Delivery }>().delivery.id,
    );
    expect(await count("select count(*)::text as n from deliveries")).toBe(1);
    expect(await count("select count(*)::text as n from stock_layers")).toBe(2);
    expect(await count("select count(*)::text as n from stock_units")).toBe(1);
    expect(await count("select count(*)::text as n from delivery_payments")).toBe(1);
    expect(await count("select count(*)::text as n from ledger_entries")).toBe(1);
    expect(await count("select count(*)::text as n from receiving_commands")).toBe(1);
  });

  it("the same commandId with a different body is 409 command_conflict and saves nothing", async () => {
    const body = deliveryBody(s, [line(s.charger.id, 1, 1_000)]);
    await receive(s.owner, body);
    const changed = { ...body, lines: [line(s.charger.id, 2, 1_000)] };
    const res = await s.owner.post("/deliveries", changed);
    expect(res.statusCode).toBe(409);
    expect(errorOf(res).code).toBe("command_conflict");
    // Even a changed note counts as a different request.
    const note = await s.owner.post("/deliveries", { ...body, note: "other" });
    expect(errorOf(note).code).toBe("command_conflict");
    expect(await count("select count(*)::text as n from deliveries")).toBe(2);
  });

  it("a commandId used by someone else, or for another kind of command, is a conflict", async () => {
    const body = deliveryBody(s, [line(s.charger.id, 1, 1_000)]);
    const d = await receive(s.owner, body);
    const keeper = await staffAt(t, s, "storekeeper");
    const other = await keeper.client.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1)]),
      commandId: body.commandId,
    });
    expect(errorOf(other).code).toBe("command_conflict");
    const asCosts = await s.owner.post(`/deliveries/${d.id}/costs`, {
      commandId: body.commandId,
      lines: [{ lineId: d.lines[0]!.id, lineTotalCents: 5 }],
    });
    expect(errorOf(asCosts).code).toBe("command_conflict");
  });

  it("several identical requests at the same moment save exactly one delivery", async () => {
    const body = deliveryBody(s, [line(s.charger.id, 3, 3_000)]);
    const before = await count("select count(*)::text as n from deliveries");
    const results = await Promise.all([0, 1, 2, 3].map(() => s.owner.post("/deliveries", body)));
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 200, 200, 201]);
    const ids = new Set(results.map((r) => r.json<{ delivery: Delivery }>().delivery.id));
    expect(ids.size).toBe(1);
    expect(await count("select count(*)::text as n from deliveries")).toBe(before + 1);
  });

  it("a request that failed validation leaves no command behind: it can be fixed and sent again", async () => {
    const body = deliveryBody(s, [line(s.phone.id, 1, 1_000, { units: [{ imei: "123" }] })]);
    expect((await s.owner.post("/deliveries", body)).statusCode).toBe(400);
    const fixed = {
      ...body,
      lines: [line(s.phone.id, 1, 1_000, { units: [{ imei: imei(210) }] })],
    };
    expect((await s.owner.post("/deliveries", fixed)).statusCode).toBe(201);
  });

  it("a commandId must be 8 to 64 characters", async () => {
    const res = await s.owner.post("/deliveries", {
      ...deliveryBody(s, [line(s.charger.id, 1)]),
      commandId: randomUUID().slice(0, 4),
    });
    expect(res.statusCode).toBe(400);
  });
});
