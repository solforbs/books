import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkPassword, createStaffResponseSchema, type SessionResponse } from "@books/shared";
import {
  addStaff,
  createLocation,
  expectStatus,
  firstLogin,
  loginAs,
  ownerWithShop,
} from "../../../../test/business-fixtures";
import { NEW_PASSWORD, PASSWORD, e164, randomEmail, randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { auditLog } from "../../audit/infrastructure/audit-log.table";

describe("POST /staff (F02 §2.3, login change)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("a new person gets a strong temporary password that works once and must be changed", async () => {
    const { owner, shop, tenantId } = await ownerWithShop(t);
    const phone = randomPhone();
    const res = expectStatus(
      await owner.post("/staff", {
        name: "Brian Otieno",
        phone,
        role: "cashier",
        locationIds: [shop.id],
        language: "so",
      }),
      201,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    const body = createStaffResponseSchema.parse(res.json());
    expect(body.member).toMatchObject({
      name: "Brian Otieno",
      phone: e164(phone),
      role: "cashier",
      locationIds: [shop.id],
      status: "active",
      mustChangePassword: true,
      permissions: {},
      lastLoginAt: null,
    });
    const temp = body.temporaryPassword;
    expect(checkPassword(temp, ["Brian Otieno"])).toEqual([]);
    const stored = await t.sql<{ password_hash: string; issued: Date | null }>(
      "select password_hash, temporary_password_issued_at as issued from users where phone = $1",
      [e164(phone)],
    );
    expect(stored[0]!.password_hash).toMatch(/^\$argon2id\$/);
    expect(Date.now() - stored[0]!.issued!.getTime()).toBeLessThan(60_000);

    const cashier = new TestClient(t.app);
    const login = expectStatus(
      await cashier.post("/auth/login", { identifier: phone, password: temp }),
      200,
    );
    const session = login.json<SessionResponse>();
    expect(session.user).toMatchObject({ mustChangePassword: true, language: "so" });
    expect(session.activeTenantId).toBe(tenantId);
    expectStatus(
      await cashier.post("/auth/change-password", {
        currentPassword: temp,
        newPassword: NEW_PASSWORD,
      }),
      204,
    );
    expect((await cashier.get("/auth/me")).json().user.mustChangePassword).toBe(false);
    expect(
      (await new TestClient(t.app).post("/auth/login", { identifier: phone, password: temp }))
        .statusCode,
    ).toBe(401);
    const cleared = await t.sql(
      "select temporary_password_issued_at as issued from users where phone = $1",
      [e164(phone)],
    );
    expect(cleared[0]).toEqual({ issued: null });

    // Audit: who added whom, phone masked, no password.
    const [entry] = await t.db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.action, "staff_added"), eq(auditLog.targetId, body.member.membershipId)),
      );
    expect(entry).toMatchObject({ tenantId, outcome: "success" });
    const dump = JSON.stringify(entry);
    expect(dump).not.toContain(temp);
    expect(dump).not.toContain(e164(phone));
    expect(dump).toContain(`+254******${phone.slice(-3)}`);
  });

  it("refuses any phone or email that already has an account (account_exists), revealing nothing", async () => {
    const { owner, shop, register } = await ownerWithShop(t);
    const other = await ownerWithShop(t);
    const email = randomEmail();
    const base = { name: "Brian Otieno", role: "cashier" as const, locationIds: [shop.id] };
    const { member } = await addStaff(owner, { ...base, phone: randomPhone(), email });
    const before = await t.sql("select count(*)::int as n from memberships");
    for (const who of [
      { phone: other.register.user.phone! }, // the owner of another business
      { phone: randomPhone(), email: email.toUpperCase() }, // staff of this one, by email
      { phone: member.phone! }, // the same person twice
      { phone: register.user.phone! }, // the owner adding themselves
      { phone: other.register.user.phone!, email: randomEmail() }, // only one of two matches
    ]) {
      const res = await owner.post("/staff", { ...base, ...who });
      expect(res.statusCode, JSON.stringify(who)).toBe(409);
      expect(res.json()).toEqual({
        error: { code: "account_exists", message: expect.any(String) },
      });
      for (const secret of [other.ownerUserId, "Amina", member.userId, member.membershipId]) {
        expect(res.body).not.toContain(secret);
      }
    }
    // Nothing was attached anywhere, and the other owner's password still works.
    expect(await t.sql("select count(*)::int as n from memberships")).toEqual(before);
    await loginAs(t, other.register.user.phone!, PASSWORD);
    // A switched-off person still has an account.
    expectStatus(await owner.post(`/staff/${member.membershipId}/switch-off`), 200);
    expect((await owner.post("/staff", { ...base, email })).json().error.code).toBe(
      "account_exists",
    );
  });

  it("POST /staff has the strict rate limit", async () => {
    const strict = await createTestApp({ AUTH_RATE_LIMIT_PER_MINUTE: "3" });
    try {
      const { owner, shop } = await ownerWithShop(strict);
      const add = () =>
        owner.post("/staff", {
          name: "Brian Otieno",
          phone: randomPhone(),
          role: "cashier",
          locationIds: [shop.id],
        });
      for (let i = 0; i < 3; i++) expectStatus(await add(), 201);
      const limited = await add();
      expect(limited.statusCode).toBe(429);
      expect(limited.json().error.code).toBe("too_many_requests");
    } finally {
      await strict.close();
    }
  });

  it("validates locations: required for non-owners, must be open locations of this business", async () => {
    const { owner } = await ownerWithShop(t);
    const other = await ownerWithShop(t);
    const base = { name: "Brian Otieno", phone: randomPhone(), role: "cashier" };
    const none = await owner.post("/staff", base);
    expect(none.json().error).toMatchObject({
      code: "validation_failed",
      details: [{ path: "locationIds", message: "location_required" }],
    });
    const foreign = await owner.post("/staff", { ...base, locationIds: [other.shop.id] });
    expect(foreign.statusCode).toBe(400);
    expect(foreign.json().error).toMatchObject({
      code: "location_not_found",
      details: { locationIds: [other.shop.id] },
    });
    // An owner needs no location: owners see everything.
    const coOwner = await addStaff(owner, {
      name: "Co Owner",
      phone: randomPhone(),
      role: "owner",
    });
    expect(coOwner.member).toMatchObject({ role: "owner", locationIds: [] });
  });

  it("a manager with add_staff adds a cashier at their own location, nothing more", async () => {
    const { owner, shop } = await ownerWithShop(t);
    const shop2 = await createLocation(owner, { name: "Shop 2", type: "shop" });
    const phone = randomPhone();
    const { temporaryPassword } = await addStaff(owner, {
      name: "Mary Wanjiku",
      phone,
      role: "manager",
      locationIds: [shop.id],
      permissions: { add_staff: true },
    });
    const manager = await firstLogin(t, phone, temporaryPassword);
    const cashier = {
      name: "Brian Otieno",
      phone: randomPhone(),
      role: "cashier" as const,
      locationIds: [shop.id],
    };

    const ok = await addStaff(manager, cashier);
    expect(ok.temporaryPassword).toEqual(expect.any(String));
    for (const body of [
      { ...cashier, phone: randomPhone(), role: "manager" },
      { ...cashier, phone: randomPhone(), role: "owner", locationIds: [] },
      { ...cashier, phone: randomPhone(), locationIds: [shop2.id] },
      { ...cashier, phone: randomPhone(), locationIds: [shop.id, shop2.id] },
      { ...cashier, phone: randomPhone(), permissions: { see_cost_profit: true } },
    ]) {
      const res = await manager.post("/staff", body);
      expect(res.statusCode, JSON.stringify(body)).toBe(403);
      expect(res.json().error.code).toBe("forbidden");
    }
    // Without the switch: no adding at all.
    const plainPhone = randomPhone();
    const plain = await addStaff(owner, {
      name: "Peter Kamau",
      phone: plainPhone,
      role: "manager",
      locationIds: [shop.id],
    });
    const plainManager = await firstLogin(t, plainPhone, plain.temporaryPassword);
    expect(
      (await plainManager.post("/staff", { ...cashier, phone: randomPhone() })).statusCode,
    ).toBe(403);
    expect((await plainManager.get("/staff")).statusCode).toBe(403);
    // The add_staff manager lists only people at their locations.
    const listed = (await manager.get("/staff")).json<{ members: { role: string }[] }>().members;
    expect(listed.map((m) => m.role).sort()).toEqual(["cashier", "manager", "manager"]);
  });
});
