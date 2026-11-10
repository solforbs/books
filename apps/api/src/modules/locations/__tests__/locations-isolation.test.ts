import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerWithShop, type OwnerShop } from "../../../../test/business-fixtures";
import { pgUrl } from "../../../../test/pg";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { pgErrorCode } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { LocationsRepository } from "../infrastructure/locations.repository";
import { MoneyPlacesRepository } from "../infrastructure/money-places.repository";
import { locations } from "../infrastructure/tables/locations.table";

/** House rule 5: business A can never reach business B's locations or money places. */
describe("locations are isolated per business", () => {
  let t: TestApp;
  let a: OwnerShop;
  let b: OwnerShop;
  let app: Pool;
  beforeAll(async () => {
    t = await createTestApp();
    a = await ownerWithShop(t, "Alpha Shop");
    b = await ownerWithShop(t, "Beta Shop");
    app = new Pool({ connectionString: pgUrl("app", t.database), max: 1 });
  });
  afterAll(async () => {
    await app.end();
    await t.close();
  });

  it("the repository never returns another business's rows, even when asked by id", async () => {
    const repo = t.app.get(LocationsRepository);
    expect(await repo.findById(a.tenantId, b.shop.id)).toBeNull();
    expect(await repo.find(a.tenantId, eq(locations.id, b.shop.id))).toEqual([]);
    expect((await repo.all(a.tenantId)).map((l) => l.id)).toEqual([a.shop.id]);
    expect(await repo.updateById(a.tenantId, b.shop.id, { name: "hacked" })).toBe(0);
    const drawers = await t.app.get(MoneyPlacesRepository).drawersOf(a.tenantId, [b.shop.id]);
    expect(drawers.size).toBe(0);
  });

  it("row-level security hides other businesses even from a query with no tenant filter", async () => {
    // Repository misuse: a raw query inside A's transaction, forgetting WHERE tenant_id.
    const rows = await t.app
      .get(TenantDb)
      .transaction(a.tenantId, async ({ tx }) => tx.select().from(locations));
    expect(rows.map((r) => r.id)).toEqual([a.shop.id]);
    for (const table of [
      "locations",
      "money_places",
      "money_place_locations",
      "membership_locations",
    ]) {
      const { rows: all } = await app.query(`select * from ${table}`);
      expect(all, table).toEqual([]); // no app.tenant_id: nothing at all
    }
  });

  it("composite foreign keys stop a link row from pointing at another business", async () => {
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
    const aDrawer = a.shop.cashDrawerId!;
    // A's money place linked to B's location.
    expect(
      await asA(
        "insert into money_place_locations (tenant_id, money_place_id, location_id) values ($1, $2, $3)",
        [a.tenantId, aDrawer, b.shop.id],
      ),
    ).toBe("23503");
    // A's member assigned to B's location.
    expect(
      await asA(
        "insert into membership_locations (tenant_id, membership_id, location_id) values ($1, $2, $3)",
        [a.tenantId, a.ownerMembershipId, b.shop.id],
      ),
    ).toBe("23503");
    // B's membership assigned to A's location.
    expect(
      await asA(
        "insert into membership_locations (tenant_id, membership_id, location_id) values ($1, $2, $3)",
        [a.tenantId, b.ownerMembershipId, a.shop.id],
      ),
    ).toBe("23503");
    // A paybill settling to B's drawer.
    expect(
      await asA(
        "insert into money_places (tenant_id, type, name, settles_to_id) values ($1, 'mpesa_paybill', 'P', $2)",
        [a.tenantId, b.shop.cashDrawerId],
      ),
    ).toBe("23503");
    // And the app role cannot delete anything (G4).
    expect(await asA("delete from locations", [])).toBe("42501");
  });
});
