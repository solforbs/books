import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Location } from "@books/shared";
import {
  addStaff,
  createLocation,
  expectStatus,
  loginAs,
  ownerWithShop,
} from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { auditLog } from "../../audit/infrastructure/audit-log.table";
import { LocationContentsProbe } from "../application/contents-probes";

describe("locations (F02 §3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const drawerOf = (tenantId: string, locationId: string) =>
    t.tenantSql<{ id: string; hidden: boolean; name: string }>(
      tenantId,
      "select id, hidden, name from money_places where drawer_location_id = $1",
      [locationId],
    );

  it("T1: a new shop sells, uses Retail and gets its cash drawer at once", async () => {
    const { shop, tenantId } = await ownerWithShop(t);
    expect(shop).toMatchObject({
      type: "shop",
      canSell: true,
      priceList: "retail",
      status: "open",
    });
    expect(shop.cashDrawerId).toEqual(expect.any(String));
    const [drawer] = await drawerOf(tenantId, shop.id);
    expect(drawer).toMatchObject({ id: shop.cashDrawerId, hidden: false, name: shop.name });
  });

  it("T2: a store does not sell and has no drawer until selling is switched on", async () => {
    const { owner, tenantId } = await ownerWithShop(t);
    const store = await createLocation(owner, { name: "Back Store", type: "store" });
    expect(store).toMatchObject({ canSell: false, cashDrawerId: null });
    expect(await drawerOf(tenantId, store.id)).toHaveLength(0);

    const on = expectStatus(await owner.patch(`/locations/${store.id}`, { canSell: true }), 200);
    const drawerId = on.json().location.cashDrawerId;
    expect(drawerId).toEqual(expect.any(String));

    // Off again: the drawer is hidden, never deleted (G4); on again: the same drawer returns.
    const off = await owner.patch(`/locations/${store.id}`, { canSell: false });
    expect(off.json().location.cashDrawerId).toBeNull();
    expect((await drawerOf(tenantId, store.id))[0]).toMatchObject({ id: drawerId, hidden: true });
    const again = await owner.patch(`/locations/${store.id}`, { canSell: true });
    expect(again.json().location.cashDrawerId).toBe(drawerId);
  });

  it("renames a location (its drawer follows) and switches the price list", async () => {
    const { owner, shop, tenantId } = await ownerWithShop(t);
    const res = await owner.patch(`/locations/${shop.id}`, {
      name: "Luthuli Shop 12",
      priceList: "wholesale",
    });
    expect(res.json().location).toMatchObject({ name: "Luthuli Shop 12", priceList: "wholesale" });
    expect((await drawerOf(tenantId, shop.id))[0]!.name).toBe("Luthuli Shop 12");
    expect((await owner.patch(`/locations/${shop.id}`, {})).statusCode).toBe(400);
  });

  it("refuses to close the last open location", async () => {
    const { owner, shop } = await ownerWithShop(t);
    const res = await owner.post(`/locations/${shop.id}/close`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("last_location");
  });

  it("closes and reopens a location; closed ones stay listed for the owner, never deleted", async () => {
    const { owner } = await ownerWithShop(t);
    const second = await createLocation(owner, { name: "Shop 2", type: "shop" });
    const closed = expectStatus(await owner.post(`/locations/${second.id}/close`), 200);
    expect(closed.json().location.status).toBe("closed");
    expect((await owner.post(`/locations/${second.id}/close`)).statusCode).toBe(200); // no-op

    const patch = await owner.patch(`/locations/${second.id}`, { name: "Renamed" });
    expect(patch.json().error.code).toBe("location_closed");
    const list = (await owner.get("/locations")).json<{ locations: Location[] }>().locations;
    expect(list.find((l) => l.id === second.id)?.status).toBe("closed");

    const reopened = expectStatus(await owner.post(`/locations/${second.id}/reopen`), 200);
    expect(reopened.json().location.status).toBe("open");
  });

  it("refuses to close a location that still holds stock or cash (location_not_empty)", async () => {
    const { owner } = await ownerWithShop(t);
    const second = await createLocation(owner, { name: "Shop 2", type: "shop" });
    const probe = t.app.get(LocationContentsProbe);
    const spy = vi
      .spyOn(probe, "contentsOf")
      .mockResolvedValue({ stockQuantity: 23, cashDrawerCents: 450_000 });
    try {
      const res = await owner.post(`/locations/${second.id}/close`);
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toMatchObject({
        code: "location_not_empty",
        details: { stockQuantity: 23, cashDrawerCents: 450_000 },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("closing unassigns the staff who worked there (F02 §8.3)", async () => {
    const { owner, shop } = await ownerWithShop(t);
    const second = await createLocation(owner, { name: "Shop 2", type: "shop" });
    const { member } = await addStaff(owner, {
      name: "Brian Otieno",
      phone: randomPhone(),
      role: "cashier",
      locationIds: [shop.id, second.id],
    });
    expectStatus(await owner.post(`/locations/${second.id}/close`), 200);
    const staff = (await owner.get("/staff")).json<{
      members: { membershipId: string; locationIds: string[] }[];
    }>();
    expect(staff.members.find((m) => m.membershipId === member.membershipId)?.locationIds).toEqual([
      shop.id,
    ]);
  });

  it("returns location_not_found for unknown ids and other businesses' locations", async () => {
    const a = await ownerWithShop(t);
    const b = await ownerWithShop(t);
    for (const id of [b.shop.id, "not-an-id", "00000000-0000-4000-8000-000000000000"]) {
      const res = await a.owner.patch(`/locations/${id}`, { name: "Mine now" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("location_not_found");
    }
  });

  it("a manager without manage_locations gets 403 forbidden; with it they add locations", async () => {
    const { owner, shop, tenantId } = await ownerWithShop(t);
    const phone = randomPhone();
    const { member, temporaryPassword } = await addStaff(owner, {
      name: "Mary Wanjiku",
      phone,
      role: "manager",
      locationIds: [shop.id],
      permissions: { manage_locations: false },
    });
    const manager = await loginAs(t, phone, temporaryPassword!);
    const denied = await manager.post("/locations", { name: "Shop 9", type: "shop" });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe("forbidden");

    expectStatus(await owner.patch(`/staff/${member.membershipId}`, { permissions: {} }), 200);
    const created = expectStatus(
      await manager.post("/locations", { name: "Shop 9", type: "shop" }),
      201,
    );
    // The manager is assigned to what they created, so they can see it.
    const mine = (await manager.get("/locations")).json<{ locations: Location[] }>().locations;
    expect(mine.map((l) => l.id).sort()).toEqual([shop.id, created.json().location.id].sort());
    const [entry] = await t.db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "location_created"),
          eq(auditLog.targetId, created.json().location.id),
        ),
      );
    expect(entry).toMatchObject({ tenantId, userId: member.userId, outcome: "success" });
  });

  it("T10: a cashier sees only their assigned locations", async () => {
    const { owner, shop } = await ownerWithShop(t);
    await createLocation(owner, { name: "Shop 2", type: "shop" });
    const phone = randomPhone();
    const { temporaryPassword } = await addStaff(owner, {
      name: "Brian Otieno",
      phone,
      role: "cashier",
      locationIds: [shop.id],
    });
    const cashier = await loginAs(t, phone, temporaryPassword!);
    const seen = (await cashier.get("/locations")).json<{ locations: Location[] }>().locations;
    expect(seen.map((l) => l.id)).toEqual([shop.id]);
    expect((await owner.get("/locations")).json().locations).toHaveLength(2);
    expect((await cashier.post("/locations", { name: "X1", type: "shop" })).statusCode).toBe(403);
  });

  it("writes audit entries for create, update, close and reopen", async () => {
    const { owner, tenantId } = await ownerWithShop(t);
    const second = await createLocation(owner, { name: "Shop 2", type: "shop" });
    await owner.patch(`/locations/${second.id}`, { name: "Shop Two" });
    await owner.post(`/locations/${second.id}/close`);
    await owner.post(`/locations/${second.id}/reopen`);
    const rows = await t.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.tenantId, tenantId), eq(auditLog.targetId, second.id)));
    expect(rows.map((r) => r.action).sort()).toEqual([
      "location_closed",
      "location_created",
      "location_reopened",
      "location_updated",
    ]);
    const update = rows.find((r) => r.action === "location_updated")!;
    expect(update.details).toMatchObject({
      before: { name: "Shop 2" },
      after: { name: "Shop Two" },
    });
  });
});
