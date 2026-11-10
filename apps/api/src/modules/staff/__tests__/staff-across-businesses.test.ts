import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StaffMember } from "@books/shared";
import {
  addStaff,
  expectStatus,
  firstLogin,
  joinDirectly,
  loginAs,
  ownerWithShop,
} from "../../../../test/business-fixtures";
import { NEW_PASSWORD, randomPhone } from "../../../../test/fixtures";
import { pgUrl } from "../../../../test/pg";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

/**
 * S1a security review #2-#5, #8: a person who works in two businesses (earlier
 * data, or the future joining code) is only ever affected in, and seen from,
 * the business doing the change.
 */
describe("staff who also work in another business", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  /** Businesses A and B; Pat works at A's shop (added there) and B's shop (joined directly). */
  async function sharedPerson() {
    const a = await ownerWithShop(t);
    const b = await ownerWithShop(t);
    const phone = randomPhone();
    const added = await addStaff(a.owner, {
      name: "Pat Mwangi",
      phone,
      role: "cashier",
      locationIds: [a.shop.id],
    });
    await firstLogin(t, phone, added.temporaryPassword);
    const inB = await joinDirectly(t, added.member.userId, b.tenantId, "cashier", [b.shop.id]);
    return { a, b, phone, inA: added.member.membershipId, inB };
  }

  async function deviceIn(phone: string, tenantId: string): Promise<TestClient> {
    const device = await loginAs(t, phone, NEW_PASSWORD);
    expectStatus(await device.post("/auth/select-business", { tenantId }), 200);
    return device;
  }

  const memberOf = async (owner: TestClient, membershipId: string): Promise<StaffMember> =>
    (await owner.get("/staff"))
      .json<{ members: StaffMember[] }>()
      .members.find((m) => m.membershipId === membershipId)!;

  it("switching off in A signs the person out of A only; B keeps working", async () => {
    const { a, b, phone, inA } = await sharedPerson();
    const inShopA = await deviceIn(phone, a.tenantId);
    const inShopB = await deviceIn(phone, b.tenantId);
    expectStatus(await inShopA.get("/locations"), 200);

    expectStatus(await a.owner.post(`/staff/${inA}/switch-off`), 200);
    expect((await inShopA.get("/locations")).json().error.code).toBe("session_expired");
    expect((await inShopA.post("/auth/refresh")).statusCode).toBe(401);
    expectStatus(await inShopB.get("/locations"), 200);
    const refreshed = expectStatus(await inShopB.post("/auth/refresh"), 200);
    expect(refreshed.json().activeTenantId).toBe(b.tenantId);
    expectStatus(await inShopB.get("/me/permissions"), 200);
  });

  it("A cannot rename someone who also works in B; other changes and self-renames still work", async () => {
    const { a, b, inA, inB } = await sharedPerson();
    const res = await a.owner.patch(`/staff/${inA}`, { name: "Someone Else" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatchObject({
      code: "forbidden",
      details: { reason: "member_of_other_business" },
    });
    expect((await memberOf(a.owner, inA)).name).toBe("Pat Mwangi");
    expect((await memberOf(b.owner, inB)).name).toBe("Pat Mwangi");
    // Sending the unchanged name, or changing only access, is fine.
    expectStatus(await a.owner.patch(`/staff/${inA}`, { name: "Pat Mwangi" }), 200);
    expectStatus(await a.owner.patch(`/staff/${inA}`, { permissions: { sell: false } }), 200);
    // An owner who also works in B still renames themselves.
    await joinDirectly(t, a.ownerUserId, b.tenantId, "owner");
    const self = expectStatus(
      await a.owner.patch(`/staff/${a.ownerMembershipId}`, { name: "Amina H." }),
      200,
    );
    expect(self.json().member.name).toBe("Amina H.");
  });

  it("a person in one business only is renamed as before", async () => {
    const a = await ownerWithShop(t);
    const { member } = await addStaff(a.owner, {
      name: "Brian Otieno",
      phone: randomPhone(),
      role: "cashier",
      locationIds: [a.shop.id],
    });
    const res = expectStatus(
      await a.owner.patch(`/staff/${member.membershipId}`, { name: "B O" }),
      200,
    );
    expect(res.json().member.name).toBe("B O");
  });

  it("login history and last login only show this business's logins", async () => {
    const { a, b, phone, inA, inB } = await sharedPerson();
    const before = (await memberOf(a.owner, inA)).lastLoginAt; // the first login, in A
    expect(before).not.toBeNull();
    expect((await memberOf(b.owner, inB)).lastLoginAt).toBeNull();
    // A wrong password from someone in two businesses concerns neither in particular.
    const guess = await new TestClient(t.app).post("/auth/login", {
      identifier: phone,
      password: "Wrong-Password-99",
    });
    expect(guess.statusCode).toBe(401);

    await deviceIn(phone, b.tenantId); // login (no business yet) + selection of B
    const historyA = expectStatus(await a.owner.get(`/staff/${inA}/logins`), 200).json().entries;
    const historyB = expectStatus(await b.owner.get(`/staff/${inB}/logins`), 200).json().entries;
    expect(historyA.map((e: { outcome: string }) => e.outcome)).toEqual(["success"]);
    expect(historyB.map((e: { outcome: string }) => e.outcome)).toEqual(["success"]);

    expect((await memberOf(a.owner, inA)).lastLoginAt).toBe(before);
    const inBLast = (await memberOf(b.owner, inB)).lastLoginAt;
    expect(inBLast).not.toBeNull();
    expect(inBLast! > before!).toBe(true);
  });

  it("reset-password checks 'one business only' and writes under one lock (no race)", async () => {
    const a = await ownerWithShop(t);
    const b = await ownerWithShop(t);
    const { member } = await addStaff(a.owner, {
      name: "Brian Otieno",
      phone: randomPhone(),
      role: "cashier",
      locationIds: [a.shop.id],
    });
    const hash = async () =>
      (await t.sql("select password_hash from users where id = $1", [member.userId]))[0];
    const original = await hash();

    // Another transaction is adding the person to B and has not committed yet.
    const other = new Client({ connectionString: pgUrl("owner", t.database) });
    await other.connect();
    try {
      await other.query("begin");
      await other.query(
        "insert into memberships (user_id, tenant_id, role) values ($1, $2, 'owner')",
        [member.userId, b.tenantId],
      );
      let settled = false;
      const reset = a.owner.post(`/staff/${member.membershipId}/reset-password`).finally(() => {
        settled = true;
      });
      await new Promise((r) => setTimeout(r, 500));
      expect(settled).toBe(false); // waiting on the lock, not deciding on stale data
      await other.query("commit");
      const res = await reset;
      expect(res.statusCode).toBe(403);
      expect(res.json().error.details).toEqual({ reason: "member_of_other_business" });
    } finally {
      await other.end();
    }
    expect(await hash()).toEqual(original);
  });
});
