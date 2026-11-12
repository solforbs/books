import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Supplier, SuppliersResponse } from "@books/shared";
import type { OwnerShop } from "../../../../test/business-fixtures";
import { pgUrl } from "../../../../test/pg";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { pgErrorCode } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { suppliers } from "../infrastructure/tables/suppliers.table";
import { addSupplier, ownerWithShop, staffMember } from "./suppliers-fixtures";

/** House rule 5: business A can never reach business B's suppliers. */
describe("suppliers are isolated per business", () => {
  let t: TestApp;
  let a: OwnerShop;
  let b: OwnerShop;
  let supplierA: Supplier;
  let supplierB: Supplier;
  let app: Pool;
  beforeAll(async () => {
    t = await createTestApp();
    a = await ownerWithShop(t);
    b = await ownerWithShop(t);
    supplierA = await addSupplier(a.owner, "Shared Name Traders", { phone: "0711222333" });
    // The same name AND the same phone in another business is not a duplicate.
    supplierB = await addSupplier(b.owner, "Shared Name Traders", { phone: "0711222333" });
    app = new Pool({ connectionString: pgUrl("app", t.database), max: 1 });
  });
  afterAll(async () => {
    await app.end();
    await t.close();
  });

  it("the same name and phone may exist in two businesses", () => {
    expect(supplierA.id).not.toBe(supplierB.id);
    expect(supplierA.phone).toBe(supplierB.phone);
  });

  it("another business's supplier answers 404 on every route", async () => {
    for (const res of [
      await a.owner.get(`/suppliers/${supplierB.id}`),
      await a.owner.patch(`/suppliers/${supplierB.id}`, { notes: "hacked" }),
      await a.owner.post(`/suppliers/${supplierB.id}/hide`),
      await a.owner.post(`/suppliers/${supplierB.id}/unhide`),
      await a.owner.post(`/suppliers/${supplierB.id}/approve`, { phone: "0799000111" }),
    ]) {
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("supplier_not_found");
    }
    const list = (await a.owner.get("/suppliers")).json<SuppliersResponse>();
    expect(list.suppliers.map((s) => s.id)).toEqual([supplierA.id]);
    expect(
      (await a.owner.get("/suppliers?q=0711222333")).json<SuppliersResponse>().suppliers,
    ).toHaveLength(1);
    const own = (await b.owner.get(`/suppliers/${supplierB.id}`)).json<{ supplier: Supplier }>();
    expect(own.supplier.notes).toBeNull();
  });

  it("a waiting supplier of another business is not in my waiting list or similar-name check", async () => {
    const keeper = (await staffMember(t, b, "storekeeper")).client;
    await keeper.post("/suppliers/quick", { name: "Zeta Hidden Quarry" });
    expect((await a.owner.get("/suppliers/waiting")).json<SuppliersResponse>().suppliers).toEqual(
      [],
    );
    expect(
      (await a.owner.post("/suppliers", { name: "Zeta Hidden Quarry", phone: "0700999000" }))
        .statusCode,
    ).toBe(201);
  });

  it("the repository never returns another business's rows", async () => {
    const repo = t.app.get(SuppliersRepository);
    expect(await repo.findById(a.tenantId, supplierB.id)).toBeNull();
    expect(await repo.updateById(a.tenantId, supplierB.id, { name: "hacked" })).toBe(0);
    expect(await repo.findByPhone(a.tenantId, "+254711222333", supplierA.id)).toBeNull();
  });

  it("row-level security hides the table from a query with no tenant filter", async () => {
    const rows = await t.app
      .get(TenantDb)
      .transaction(a.tenantId, async ({ tx }) => tx.select().from(suppliers));
    expect(rows.map((r) => r.id)).toContain(supplierA.id);
    expect(rows.map((r) => r.id)).not.toContain(supplierB.id);
    expect(new Set(rows.map((r) => r.tenantId))).toEqual(new Set([a.tenantId]));
    const { rows: none } = await app.query("select * from suppliers");
    expect(none).toEqual([]);
    const client = await app.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.tenant_id', $1, true)", [a.tenantId]);
      const { rows: mine } = await client.query("select tenant_id from suppliers");
      await client.query("rollback");
      expect(new Set(mine.map((r) => r.tenant_id))).toEqual(new Set([a.tenantId]));
    } finally {
      client.release();
    }
  });

  it("the database refuses a row stamped with another business, and DELETE", async () => {
    const asA = async (text: string, params: unknown[]) => {
      const client = await app.connect();
      try {
        await client.query("begin");
        await client.query("select set_config('app.tenant_id', $1, true)", [a.tenantId]);
        await client.query(text, params);
        await client.query("commit");
        return "no error";
      } catch (err) {
        await client.query("rollback");
        return pgErrorCode(err);
      } finally {
        client.release();
      }
    };
    expect(
      await asA(
        "insert into suppliers (tenant_id, name, name_key, phone, added_by_user_id) values ($1, 'x', 'x', '+254700000009', $2)",
        [b.tenantId, a.ownerUserId],
      ),
    ).toBe("42501");
    expect(await asA("delete from suppliers", [])).toBe("42501");
    // A rule without its period, and an active supplier without a phone, are refused by checks.
    expect(
      await asA(
        "insert into suppliers (tenant_id, name, name_key, phone, payment_type, added_by_user_id) values ($1, 'x', 'x', '+254700000008', 'within_time', $2)",
        [a.tenantId, a.ownerUserId],
      ),
    ).toBe("23514");
    expect(
      await asA(
        "insert into suppliers (tenant_id, name, name_key, status, added_by_user_id) values ($1, 'x', 'x', 'active', $2)",
        [a.tenantId, a.ownerUserId],
      ),
    ).toBe("23514");
    // Two suppliers cannot share a phone in one business, even past the application check.
    expect(
      await asA(
        "insert into suppliers (tenant_id, name, name_key, phone, added_by_user_id) values ($1, 'dup', 'dup', '+254711222333', $2)",
        [a.tenantId, a.ownerUserId],
      ),
    ).toBe("23505");
  });
});
