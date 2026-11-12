import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { pgUrl } from "../../../../test/pg";
import { pgErrorCode } from "../../../common/database/pg-errors";
import {
  deliveryBody,
  errorOf,
  imei,
  line,
  receive,
  receivingShop,
  type ReceivingShop,
} from "./receiving-fixtures";
import type { Delivery } from "@books/shared";

/** Cross-business isolation (house rule 5), row-level security and the append-only books. */
describe("receiving stock: isolation, row-level security and append-only (F04a)", () => {
  let t: TestApp;
  let a: ReceivingShop;
  let b: ReceivingShop;
  let app: Pool; // connected as the restricted app role, like the API itself
  let delivery: Delivery;
  beforeAll(async () => {
    t = await createTestApp();
    a = await receivingShop(t);
    b = await receivingShop(t);
    app = new Pool({ connectionString: pgUrl("app", t.database), max: 2 });
    delivery = await receive(a.owner, {
      ...deliveryBody(a, [
        line(a.phone.id, 1, 100_000, { units: [{ imei: imei(400) }] }),
        line(a.charger.id, 4, 4_000),
      ]),
      payments: [{ moneyPlaceId: a.drawerId, amountCents: 1_000 }],
    });
  });
  afterAll(async () => {
    await app.end();
    await t.close();
  });

  async function asTenant<R>(tenantId: string, work: (c: PoolClient) => Promise<R>): Promise<R> {
    const client = await app.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
  const code = (p: Promise<unknown>) => p.then(() => "no error", pgErrorCode);

  it("another business cannot read a delivery, a unit, or the stock of this one", async () => {
    expect((await b.owner.get(`/deliveries/${delivery.id}`)).statusCode).toBe(404);
    expect((await b.owner.get("/deliveries")).json<{ deliveries: unknown[] }>().deliveries).toEqual(
      [],
    );
    expect((await b.owner.get("/stock")).json<{ rows: unknown[] }>().rows).toEqual([]);
    expect(
      (await b.owner.get(`/stock/lookup?number=${imei(400)}`)).json<{ units: unknown[] }>().units,
    ).toEqual([]);
    expect(
      (await a.owner.get(`/stock/lookup?number=${imei(400)}`)).json<{ units: unknown[] }>().units,
    ).toHaveLength(1);
    // Nor act on it.
    const costs = await b.owner.post(`/deliveries/${delivery.id}/costs`, {
      commandId: "cmd-cross-tenant-1",
      lines: [{ lineId: delivery.lines[0]!.id, lineTotalCents: 1 }],
    });
    expect(costs.statusCode).toBe(404);
  });

  it("another business cannot use this one's supplier, product, location or money place", async () => {
    const withA = (over: object) => ({ ...deliveryBody(b, [line(b.charger.id, 1)]), ...over });
    const supplier = await b.owner.post("/deliveries", withA({ supplierId: a.supplier.id }));
    expect(errorOf(supplier).code).toBe("supplier_not_found");
    const product = await b.owner.post("/deliveries", {
      ...withA({}),
      lines: [line(a.charger.id, 1)],
    });
    expect(errorOf(product).code).toBe("product_not_found");
    const location = await b.owner.post("/deliveries", withA({ locationId: a.shop.id }));
    expect(errorOf(location).code).toBe("location_not_found");
    const place = await b.owner.post("/deliveries", {
      ...deliveryBody(b, [line(b.charger.id, 1, 5_000)]),
      payments: [{ moneyPlaceId: a.drawerId, amountCents: 100 }],
    });
    expect(errorOf(place).code).toBe("money_place_not_found");
  });

  it("the same IMEI and the same commandId can exist in two businesses", async () => {
    const body = deliveryBody(b, [
      line(b.phone.id, 1, undefined, { units: [{ imei: imei(400) }] }),
    ]);
    expect((await b.owner.post("/deliveries", body)).statusCode).toBe(201);
    const shared = { ...deliveryBody(b, [line(b.charger.id, 1)]), commandId: delivery.id };
    expect((await b.owner.post("/deliveries", shared)).statusCode).toBe(201);
  });

  it("row-level security hides every new table from another business, even without a filter", async () => {
    const tables = [
      "deliveries",
      "delivery_lines",
      "delivery_payments",
      "receiving_commands",
      "stock_layers",
      "stock_units",
      "stock_movements",
      "ledger_entries",
      "ledger_lines",
    ];
    for (const table of tables) {
      const own = await asTenant(a.tenantId, (c) => c.query(`select 1 from ${table}`));
      expect(own.rowCount, `${table} for its own business`).toBeGreaterThan(0);
      const rows = await asTenant(b.tenantId, (c) =>
        c.query(`select 1 from ${table} where tenant_id = $1`, [a.tenantId]),
      );
      expect(rows.rowCount, `${table} seen from another business`).toBe(0);
    }
    // Writing a row for another business is refused by the policy (42501).
    const forged = asTenant(b.tenantId, (c) =>
      c.query(
        "insert into receiving_commands (tenant_id, command_id, operation, delivery_id, request_hash, user_id) values ($1, 'forged-1', 'create', $2, 'x', $3)",
        [a.tenantId, delivery.id, a.ownerUserId],
      ),
    );
    expect(await code(forged)).toBe("42501");
  });

  it("the app role can only read and add: ledger, movements, deliveries and payments are append-only", async () => {
    const readOnly = [
      ["ledger_entries", "type"],
      ["ledger_lines", "currency"],
      ["stock_movements", "source_type"],
      ["deliveries", "note"],
      ["delivery_lines", "quantity"],
      ["delivery_payments", "drawer_negative"],
      ["receiving_commands", "request_hash"],
    ] as const;
    for (const [table, column] of readOnly) {
      const update = asTenant(a.tenantId, (c) =>
        c.query(`update ${table} set ${column} = ${column}`),
      );
      expect(await code(update), `update ${table}`).toBe("42501");
      const remove = asTenant(a.tenantId, (c) => c.query(`delete from ${table}`));
      expect(await code(remove), `delete ${table}`).toBe("42501");
    }
    // Layers and units: only the cost column may be updated, and never deleted.
    const quantity = asTenant(a.tenantId, (c) =>
      c.query("update stock_layers set remaining_quantity = 0"),
    );
    expect(await code(quantity)).toBe("42501");
    const status = asTenant(a.tenantId, (c) => c.query("update stock_units set status = 'sold'"));
    expect(await code(status)).toBe("42501");
    expect(await code(asTenant(a.tenantId, (c) => c.query("delete from stock_layers")))).toBe(
      "42501",
    );
  });

  it("every ledger entry adds up to zero; the database refuses one that does not", async () => {
    const unbalanced = await t.tenantSql<{ id: string }>(
      a.tenantId,
      `select entry_id as id from ledger_lines group by entry_id, currency having sum(amount_cents) <> 0`,
    );
    expect(unbalanced).toEqual([]);
    const entries = await t.tenantSql<{ n: string }>(
      a.tenantId,
      "select count(*)::text as n from ledger_entries",
    );
    expect(Number(entries[0]!.n)).toBeGreaterThan(0);

    const forged = asTenant(a.tenantId, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        "insert into ledger_entries (tenant_id, type, created_by_user_id, source_type, source_id, command_id) values ($1, 'delivery', $2, 'delivery', $3, 'unbalanced-1') returning id",
        [a.tenantId, a.ownerUserId, delivery.id],
      );
      await c.query(
        "insert into ledger_lines (tenant_id, entry_id, account, amount_cents, amount_kes_cents) values ($1, $2, 'inventory', 500, 500)",
        [a.tenantId, rows[0]!.id],
      );
    });
    expect(await code(forged)).toBe("23514");
  });

  it("stock on hand equals the sum of its layers; a layer never exceeds what was received", async () => {
    const quantity = await t.tenantSql<{ layers: string }>(
      a.tenantId,
      "select coalesce(sum(remaining_quantity), 0)::text as layers from stock_layers where tracking_type = 'quantity'",
    );
    const rows = (await a.owner.get("/stock")).json<{
      rows: { trackingType: string; onHand: number }[];
    }>().rows;
    const reported = rows
      .filter((r) => r.trackingType === "quantity")
      .reduce((n, r) => n + r.onHand, 0);
    expect(reported).toBe(Number(quantity[0]!.layers));
    const tracked = await t.tenantSql<{ n: string }>(
      a.tenantId,
      "select count(*)::text as n from stock_units where status = 'in_stock'",
    );
    expect(
      rows.filter((r) => r.trackingType !== "quantity").reduce((n, r) => n + r.onHand, 0),
    ).toBe(Number(tracked[0]!.n));
    // Movements replayed give the same quantity as the layers received.
    const replay = await t.tenantSql<{ moved: string; received: string }>(
      a.tenantId,
      "select (select coalesce(sum(quantity_delta), 0) from stock_movements)::text as moved, (select coalesce(sum(received_quantity), 0) from stock_layers)::text as received",
    );
    expect(replay[0]!.moved).toBe(replay[0]!.received);
  });
});
