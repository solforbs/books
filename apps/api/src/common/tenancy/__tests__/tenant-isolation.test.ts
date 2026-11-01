import { randomUUID } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cents } from "@books/shared";
import { TenantDb } from "../tenant-db";
import { TenantScopedRepository, assertTenantIdUntouched } from "../tenant-scoped.repository";
import {
  createWidgetsDb,
  widgets,
  widgetsNoRls,
  type WidgetTable,
  type WidgetsDb,
} from "./widgets.fixture";

class WidgetRepository<T extends WidgetTable> extends TenantScopedRepository<T> {
  constructor(tenantDb: TenantDb, table: T) {
    super(tenantDb, table);
  }
}

describe.each([
  ["with row-level security", widgets],
  ["repository guard alone (no row-level security)", widgetsNoRls],
] as const)("TenantScopedRepository, %s: one business never sees another's data", (_, table) => {
  let wdb: WidgetsDb;
  let tenantDb: TenantDb;
  let repo: WidgetRepository<WidgetTable>;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let widgetB: typeof widgets.$inferSelect;

  beforeAll(async () => {
    wdb = await createWidgetsDb();
    // The app's restricted role, exactly like the API at runtime.
    tenantDb = new TenantDb(drizzle(wdb.pool("app")));
    repo = new WidgetRepository<WidgetTable>(tenantDb, table);
    await repo.create(tenantA, { name: "A phone", priceCents: cents(1_250_050) });
    widgetB = await repo.create(tenantB, { name: "B phone", priceCents: cents(999_900) });
  });
  afterAll(() => wdb.close());

  it("stamps the tenant on create and stores money as integer cents (bigint)", () => {
    expect(widgetB.tenantId).toBe(tenantB);
    expect(widgetB.priceCents).toBe(999_900);
  });

  it("findById cannot fetch another tenant's row", async () => {
    expect(await repo.findById(tenantA, widgetB.id)).toBeNull();
    expect((await repo.findById(tenantB, widgetB.id))?.name).toBe("B phone");
    expect(await repo.findById(tenantA, "not-a-uuid")).toBeNull();
  });

  it("find, findOne and count only see the caller's tenant", async () => {
    expect((await repo.find(tenantA)).map((w) => w.name)).toEqual(["A phone"]);
    expect(await repo.findOne(tenantA, eq(table.name, "B phone"))).toBeNull();
    expect(await repo.count(tenantA)).toBe(1);
  });

  it("a filter can narrow but never widen the result", async () => {
    expect(await repo.find(tenantA, eq(table.tenantId, tenantB))).toEqual([]);
    const widened = [sql`true or true`, or(eq(table.tenantId, tenantB), sql`true`)!];
    for (const where of widened) {
      expect((await repo.find(tenantA, where)).map((w) => w.name)).toEqual(["A phone"]);
      expect(await repo.count(tenantA, where)).toBe(1);
    }
  });

  it("a tenantId smuggled into create is overwritten with the caller's", async () => {
    const values = { name: "smuggled", priceCents: cents(1), tenantId: tenantB } as never;
    const created = await repo.create(tenantA, values);
    expect(created.tenantId).toBe(tenantA);
  });

  it("update cannot touch another tenant's row", async () => {
    expect(await repo.update(tenantA, eq(table.id, widgetB.id), { name: "hacked" })).toBe(0);
    expect(await repo.update(tenantA, sql`true or true`, { name: "hacked" })).toBeGreaterThan(0);
    expect((await repo.findById(tenantB, widgetB.id))?.name).toBe("B phone");
  });

  it.each([
    ["tenantId", { tenantId: randomUUID() }, "tenantId cannot be changed"],
    ["tenantId next to other fields", { name: "moved", tenantId: randomUUID() }, "tenantId"],
    ["id", { id: randomUUID() }, "id cannot be changed"],
  ])("update refuses a change of %s", async (_, set, message) => {
    await expect(repo.update(tenantB, eq(table.id, widgetB.id), set as never)).rejects.toThrow(
      message,
    );
    const after = await repo.findById(tenantB, widgetB.id);
    expect(after).toMatchObject({ tenantId: tenantB, name: "B phone", id: widgetB.id });
  });

  it("update still allows ordinary changes of the caller's own row", async () => {
    const bump = { name: "renamed", priceCents: sql`${table.priceCents} + 100` as never };
    expect(await repo.update(tenantB, eq(table.id, widgetB.id), bump)).toBe(1);
    expect(await repo.findById(tenantB, widgetB.id)).toMatchObject({
      name: "renamed",
      priceCents: 1_000_000,
      tenantId: tenantB,
    });
    await repo.update(tenantB, eq(table.id, widgetB.id), { name: "B phone" });
    // Only the exact field is guarded, not look-alike names.
    expect(() => assertTenantIdUntouched(table, { tenantIdNote: "x" })).not.toThrow();
  });

  it("refuses to run without a valid tenantId", async () => {
    await expect(repo.find("")).rejects.toThrow("tenantId is required");
    await expect(repo.count("not-an-id")).rejects.toThrow("tenantId is required");
    await expect(tenantDb.transaction("x", async () => 1)).rejects.toThrow("tenantId is required");
  });

  it("enlists in the caller's tenant transaction, and refuses another tenant's", async () => {
    const before = await repo.count(tenantA);
    await expect(
      tenantDb.transaction(tenantA, async (tx) => {
        await repo.create(tenantA, { name: "draft", priceCents: cents(5) }, tx);
        expect(await repo.count(tenantA, undefined, tx)).toBe(before + 1);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await repo.count(tenantA)).toBe(before);

    await expect(
      tenantDb.transaction(tenantA, (tx) => repo.find(tenantB, undefined, {}, tx)),
    ).rejects.toThrow("transaction belongs to another tenant");
  });

  it("has no delete method (G4: nothing is deleted)", () => {
    for (const name of ["delete", "deleteOne", "deleteMany", "remove"])
      expect(name in repo).toBe(false);
  });
});
