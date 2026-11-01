import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRoleProblems, readAppRoleFacts } from "../../database/app-role-check";
import { pgErrorCode } from "../../database/pg-errors";
import { createWidgetsDb, type WidgetsDb } from "./widgets.fixture";

/**
 * The second guard: even app code that forgets the tenant filter entirely
 * (raw SQL, no repository) cannot see or write another business's rows.
 */
describe("PostgreSQL row-level security on tenant-owned tables", () => {
  let wdb: WidgetsDb;
  let app: Pool;
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  /** Runs `work` in a transaction with `SET LOCAL app.tenant_id`, as TenantDb does. */
  async function asTenant<R>(pool: Pool, tenantId: string, work: (c: PoolClient) => Promise<R>) {
    const client = await pool.connect();
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
  const failureCode = (p: Promise<unknown>) => p.then(() => "no error", pgErrorCode);
  const names = async (c: PoolClient | Pool) =>
    (await c.query<{ name: string }>("select name from widgets order by name")).rows.map(
      (r) => r.name,
    );
  const insert = "insert into widgets (tenant_id, name, price_cents) values ($1, $2, $3)";

  beforeAll(async () => {
    wdb = await createWidgetsDb();
    app = wdb.pool("app", 1); // one connection: proves nothing leaks between transactions
    // FORCE row-level security: even the owner has to name the tenant to write.
    const owner = wdb.pool("owner", 1);
    await asTenant(owner, tenantA, (c) => c.query(insert, [tenantA, "A1", 100]));
    await asTenant(owner, tenantA, (c) => c.query(insert, [tenantA, "A2", 200]));
    await asTenant(owner, tenantB, (c) => c.query(insert, [tenantB, "B1", 300]));
  });
  afterAll(() => wdb.close());

  it("an unfiltered SELECT sees only the transaction's business", async () => {
    expect(await asTenant(app, tenantA, names)).toEqual(["A1", "A2"]);
    expect(await asTenant(app, tenantB, names)).toEqual(["B1"]);
  });

  it("without app.tenant_id every row is hidden, and the setting never outlives its transaction", async () => {
    expect(await names(app)).toEqual([]);
    await asTenant(app, tenantA, names);
    expect(await names(app)).toEqual([]); // same pooled connection, after commit
    expect(await names(wdb.pool("owner", 1))).toEqual([]); // FORCE: the owner too
  });

  it("an unfiltered UPDATE changes only the transaction's business", async () => {
    const changed = await asTenant(app, tenantA, async (c) => {
      const res = await c.query("update widgets set price_cents = price_cents + 1");
      await c.query("update widgets set price_cents = price_cents - 1");
      return res.rowCount;
    });
    expect(changed).toBe(2);
    expect(await asTenant(app, tenantB, names)).toEqual(["B1"]);
  });

  it("refuses to insert a row for another business (WITH CHECK)", async () => {
    const res = asTenant(app, tenantA, (c) => c.query(insert, [tenantB, "sneaky", 1]));
    expect(await failureCode(res)).toBe("42501");
    expect(await asTenant(app, tenantB, names)).toEqual(["B1"]);
  });

  it("refuses to move a row to another business", async () => {
    const res = asTenant(app, tenantA, (c) =>
      c.query("update widgets set tenant_id = $1 where name = 'A1'", [tenantB]),
    );
    expect(await failureCode(res)).toBe("42501");
    expect(await asTenant(app, tenantA, names)).toEqual(["A1", "A2"]);
  });

  it("the app role cannot delete rows, switch RLS off, or set itself free", async () => {
    const tries = [
      "delete from widgets",
      "alter table widgets disable row level security",
      "alter table widgets no force row level security",
      "drop policy tenant_isolation on widgets",
      "alter role books_app bypassrls",
    ];
    for (const statement of tries) {
      const code = await failureCode(asTenant(app, tenantA, (c) => c.query(statement)));
      expect(code, statement).toBe("42501");
    }
    expect(await asTenant(app, tenantA, names)).toEqual(["A1", "A2"]);
  });

  it("the app role is an ordinary role: no superuser, no BYPASSRLS, owns no table", async () => {
    const facts = await readAppRoleFacts(app);
    expect(facts).toMatchObject({ role: "books_app", superuser: false, bypassRls: false });
    expect(appRoleProblems(facts)).toEqual([]);
    // The migration role owns the tables, which is why the API must not use it for requests.
    const owner = await readAppRoleFacts(wdb.pool("owner", 1));
    expect(appRoleProblems(owner)).toEqual([expect.stringContaining("owns tables")]);
  });
});
