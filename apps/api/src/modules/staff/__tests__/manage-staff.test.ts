import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addStaff,
  createLocation,
  expectStatus,
  firstLogin,
  joinDirectly,
  loginAs,
  ownerWithShop,
} from "../../../../test/business-fixtures";
import { NEW_PASSWORD, PASSWORD, randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { auditLog } from "../../audit/infrastructure/audit-log.table";

describe("managing staff (F02 §4.3, §2.5)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  /** A business with a logged-in cashier at its shop. */
  async function withCashier() {
    const biz = await ownerWithShop(t);
    const phone = randomPhone();
    const added = await addStaff(biz.owner, {
      name: "Brian Otieno",
      phone,
      role: "cashier",
      locationIds: [biz.shop.id],
    });
    const cashier = await firstLogin(t, phone, added.temporaryPassword);
    // `password` is the cashier's own password, set at first login.
    return { ...biz, phone, member: added.member, password: NEW_PASSWORD, cashier };
  }

  it("T8: the only owner cannot switch themselves off or step down (last_owner)", async () => {
    const { owner, ownerMembershipId } = await ownerWithShop(t);
    for (const res of [
      await owner.post(`/staff/${ownerMembershipId}/switch-off`),
      await owner.patch(`/staff/${ownerMembershipId}`, { role: "manager" }),
    ]) {
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("last_owner");
    }
  });

  it("with two owners, nobody changes their own role, switches or status (cannot_change_self)", async () => {
    const { owner, ownerMembershipId, shop } = await ownerWithShop(t);
    const phone = randomPhone();
    const co = await addStaff(owner, { name: "Co Owner", phone, role: "owner" });
    for (const res of [
      await owner.post(`/staff/${ownerMembershipId}/switch-off`),
      await owner.patch(`/staff/${ownerMembershipId}`, { role: "manager", locationIds: [shop.id] }),
      await owner.patch(`/staff/${ownerMembershipId}`, { permissions: { sell: false } }),
    ]) {
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("cannot_change_self");
    }
    // A name change of one's own is fine.
    expectStatus(await owner.patch(`/staff/${ownerMembershipId}`, { name: "Amina H." }), 200);
    // The other owner may switch this one off; then the remaining one is the last owner.
    const coOwner = await firstLogin(t, phone, co.temporaryPassword);
    expectStatus(await coOwner.post(`/staff/${ownerMembershipId}/switch-off`), 200);
    const last = await coOwner.post(`/staff/${co.member.membershipId}/switch-off`);
    expect(last.json().error.code).toBe("last_owner");
  });

  it("T7: switching off cuts the person's very next request and refresh; history stays", async () => {
    const { owner, cashier, member, tenantId, phone, password } = await withCashier();
    expectStatus(await cashier.get("/locations"), 200);

    const off = expectStatus(await owner.post(`/staff/${member.membershipId}/switch-off`), 200);
    expect(off.json().member.status).toBe("switched_off");
    expect((await cashier.get("/locations")).json().error.code).toBe("session_expired");
    expect((await cashier.post("/auth/refresh")).statusCode).toBe(401);
    // Logging in again finds no business to work in.
    const again = new TestClient(t.app);
    const login = expectStatus(
      await again.post("/auth/login", { identifier: phone, password }),
      200,
    );
    expect(login.json().memberships).toEqual([]);
    expect((await again.get("/locations")).json().error.code).toBe("business_not_selected");

    // Still listed for the owner (G4), and back on with one tap.
    const listed = (await owner.get("/staff")).json().members;
    expect(
      listed.find((m: { membershipId: string }) => m.membershipId === member.membershipId).status,
    ).toBe("switched_off");
    expectStatus(await owner.post(`/staff/${member.membershipId}/switch-on`), 200);
    const back = await loginAs(t, phone, password);
    expectStatus(await back.get("/locations"), 200);

    const actions = (
      await t.db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.tenantId, tenantId), eq(auditLog.targetId, member.membershipId)))
    ).map((r) => r.action);
    expect(actions).toEqual(
      expect.arrayContaining(["staff_added", "staff_switched_off", "staff_switched_on"]),
    );
  });

  it("a role change takes effect on the person's next request", async () => {
    const { owner, cashier, member } = await withCashier();
    expect((await cashier.post("/locations", { name: "Shop 7", type: "shop" })).statusCode).toBe(
      403,
    );
    const res = expectStatus(
      await owner.patch(`/staff/${member.membershipId}`, { role: "manager" }),
      200,
    );
    expect(res.json().member.role).toBe("manager");
    expectStatus(await cashier.post("/locations", { name: "Shop 7", type: "shop" }), 201);
    expect((await cashier.get("/me/permissions")).json().role).toBe("manager");
    const [entry] = await t.db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.action, "staff_role_changed"), eq(auditLog.targetId, member.membershipId)),
      );
    expect(entry!.details).toMatchObject({
      before: { role: "cashier" },
      after: { role: "manager" },
    });
  });

  it("location and switch changes apply at once; a non-owner always keeps a location", async () => {
    const { owner, cashier, member, shop } = await withCashier();
    const shop2 = await createLocation(owner, { name: "Shop 2", type: "shop" });
    expectStatus(
      await owner.patch(`/staff/${member.membershipId}`, { locationIds: [shop2.id] }),
      200,
    );
    const seen = (await cashier.get("/locations"))
      .json()
      .locations.map((l: { id: string }) => l.id);
    expect(seen).toEqual([shop2.id]);
    expect(
      (await owner.patch(`/staff/${member.membershipId}`, { locationIds: [] })).json().error.code,
    ).toBe("location_required");
    expectStatus(
      await owner.patch(`/staff/${member.membershipId}`, { permissions: { sell: false } }),
      200,
    );
    expect((await cashier.get("/me/permissions")).json().permissions).not.toContain("sell");
    // permissions REPLACES the whole switch map: a new map drops old switches; {} clears all.
    const replaced = await owner.patch(`/staff/${member.membershipId}`, {
      permissions: { see_cost_profit: true },
    });
    expect(replaced.json().member.permissions).toEqual({ see_cost_profit: true });
    const cleared = await owner.patch(`/staff/${member.membershipId}`, { permissions: {} });
    expect(cleared.json().member.permissions).toEqual({});
    expect((await cashier.get("/me/permissions")).json().permissions).toContain("sell");
    expect(shop.id).not.toBe(shop2.id);
  });

  it("promotes to owner with role + empty locationIds together; userId is the session user id", async () => {
    const { owner, cashier, member } = await withCashier();
    const me = (await cashier.get("/auth/me")).json();
    expect(member.userId).toBe(me.user.id);
    const res = expectStatus(
      await owner.patch(`/staff/${member.membershipId}`, { role: "owner", locationIds: [] }),
      200,
    );
    expect(res.json().member).toMatchObject({ role: "owner", locationIds: [] });
    const access = (await cashier.get("/me/permissions")).json();
    expect(access).toMatchObject({ role: "owner", locationIds: [] });
    // And back down to a cashier, with a location, in one request.
    const shopId = (await owner.get("/locations")).json().locations[0].id;
    const down = await owner.patch(`/staff/${member.membershipId}`, {
      role: "cashier",
      locationIds: [shopId],
    });
    expect(down.json().member).toMatchObject({ role: "cashier", locationIds: [shopId] });
  });

  it("only owners change staff; managers and cashiers get 403", async () => {
    const { owner, cashier, member, shop } = await withCashier();
    const phone = randomPhone();
    const m = await addStaff(owner, {
      name: "Mary Wanjiku",
      phone,
      role: "manager",
      locationIds: [shop.id],
      permissions: { add_staff: true },
    });
    const manager = await firstLogin(t, phone, m.temporaryPassword);
    for (const client of [manager, cashier]) {
      for (const res of [
        await client.patch(`/staff/${member.membershipId}`, { name: "X Y" }),
        await client.post(`/staff/${member.membershipId}/switch-off`),
        await client.post(`/staff/${member.membershipId}/switch-on`),
        await client.get(`/staff/${member.membershipId}/logins`),
      ]) {
        expect(res.statusCode).toBe(403);
        expect(res.json().error.code).toBe("forbidden");
      }
    }
    // Unknown member.
    const missing = await owner.patch(`/staff/00000000-0000-4000-8000-000000000000`, {
      name: "X Y",
    });
    expect(missing.json().error.code).toBe("member_not_found");
  });

  it("T9: owner or an add_staff manager resets a cashier's password; the old one stops working", async () => {
    const { owner, cashier, member, phone, password, shop } = await withCashier();
    const res = expectStatus(await owner.post(`/staff/${member.membershipId}/reset-password`), 200);
    const fresh = res.json().temporaryPassword as string;
    expect(res.headers["cache-control"]).toBe("no-store");
    expect((await cashier.get("/auth/me")).json().error.code).toBe("session_expired");
    expect(
      (await new TestClient(t.app).post("/auth/login", { identifier: phone, password })).statusCode,
    ).toBe(401);
    const back = await loginAs(t, phone, fresh);
    expect((await back.get("/auth/me")).json().user.mustChangePassword).toBe(true);

    const mPhone = randomPhone();
    const m = await addStaff(owner, {
      name: "Mary Wanjiku",
      phone: mPhone,
      role: "manager",
      locationIds: [shop.id],
      permissions: { add_staff: true },
    });
    const manager = await firstLogin(t, mPhone, m.temporaryPassword);
    expectStatus(await manager.post(`/staff/${member.membershipId}/reset-password`), 200);
    // ...but not another manager's, nor their own.
    const own = await manager.post(`/staff/${m.member.membershipId}/reset-password`);
    expect(own.statusCode).toBe(403);
  });

  it("refuses to reset the password of someone who also works in another business", async () => {
    const a = await ownerWithShop(t);
    const b = await ownerWithShop(t);
    // B's owner also works in A (earlier data; adding staff no longer attaches accounts).
    const membershipId = await joinDirectly(t, b.ownerUserId, a.tenantId, "cashier", [a.shop.id]);
    const res = await a.owner.post(`/staff/${membershipId}/reset-password`);
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatchObject({
      code: "forbidden",
      details: { reason: "member_of_other_business" },
    });
    await loginAs(t, b.register.user.phone!, PASSWORD); // their own password still works
  });

  it("shows the owner a person's login history from the audit log", async () => {
    const { owner, member, phone, password } = await withCashier();
    await new TestClient(t.app).post("/auth/login", {
      identifier: phone,
      password: "Wrong-Password-99",
    });
    await loginAs(t, phone, password);
    const res = expectStatus(await owner.get(`/staff/${member.membershipId}/logins`), 200);
    const entries = res.json().entries as { outcome: string; at: string; device: string | null }[];
    expect(entries.map((e) => e.outcome)).toEqual(["success", "failure", "success"]);
    expect(entries[0]!.at >= entries[1]!.at).toBe(true);
  });
});
