import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkPassword, createStaffResponseSchema, type SessionResponse } from "@books/shared";
import {
  addStaff,
  createLocation,
  expectStatus,
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
    const body = createStaffResponseSchema.parse(res.json());
    expect(body.member).toMatchObject({
      name: "Brian Otieno",
      phone: e164(phone),
      role: "cashier",
      locationIds: [shop.id],
      status: "active",
      mustChangePassword: true,
      permissions: {},
    });
    const temp = body.temporaryPassword!;
    expect(checkPassword(temp, ["Brian Otieno"])).toEqual([]);
    const stored = await t.sql<{ password_hash: string }>(
      "select password_hash from users where phone = $1",
      [e164(phone)],
    );
    expect(stored[0]!.password_hash).toMatch(/^\$argon2id\$/);

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

  it("someone who already has an account (another business) keeps their password and picks the business", async () => {
    const shopA = await ownerWithShop(t);
    const shopB = await ownerWithShop(t);
    const phone = shopB.register.user.phone!; // the owner of B
    const { member, temporaryPassword } = await addStaff(shopA.owner, {
      name: "Ignored Name",
      phone,
      role: "manager",
      locationIds: [shopA.shop.id],
    });
    expect(temporaryPassword).toBeNull();
    expect(member).toMatchObject({
      userId: shopB.ownerUserId,
      role: "manager",
      mustChangePassword: false,
    });

    const client = new TestClient(t.app);
    const login = expectStatus(
      await client.post("/auth/login", { identifier: phone, password: PASSWORD }),
      200,
    );
    const session = login.json<SessionResponse>();
    expect(session.activeTenantId).toBeNull(); // two businesses: they choose
    expect(session.memberships.map((m) => m.tenantId).sort()).toEqual(
      [shopA.tenantId, shopB.tenantId].sort(),
    );
    expectStatus(await client.post("/auth/select-business", { tenantId: shopA.tenantId }), 200);
    expect((await client.get("/me/permissions")).json().role).toBe("manager");
  });

  it("refuses the same person twice (already_member), even by email or switched off", async () => {
    const { owner, shop, register } = await ownerWithShop(t);
    const phone = randomPhone();
    const email = randomEmail();
    const base = { name: "Brian Otieno", role: "cashier" as const, locationIds: [shop.id] };
    const { member } = await addStaff(owner, { ...base, phone, email });
    for (const who of [{ phone }, { email: email.toUpperCase() }]) {
      const res = await owner.post("/staff", { ...base, ...who });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("already_member");
    }
    expectStatus(await owner.post(`/staff/${member.membershipId}/switch-off`), 200);
    expect((await owner.post("/staff", { ...base, phone })).json().error.code).toBe(
      "already_member",
    );
    // The owner adding themselves.
    const self = await owner.post("/staff", { ...base, phone: register.user.phone });
    expect(self.json().error.code).toBe("already_member");
  });

  it("refuses a phone of one person with the email of another (identifier_taken)", async () => {
    const { owner, shop } = await ownerWithShop(t);
    const other = await ownerWithShop(t);
    const emailOwner = randomEmail();
    await addStaff(other.owner, {
      name: "Ann Achieng",
      email: emailOwner,
      role: "cashier",
      locationIds: [other.shop.id],
    });
    const res = await owner.post("/staff", {
      name: "Mixed Up",
      phone: other.register.user.phone!,
      email: emailOwner,
      role: "cashier",
      locationIds: [shop.id],
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("identifier_taken");
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
    const manager = await loginAs(t, phone, temporaryPassword!);
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
    const plainManager = await loginAs(t, plainPhone, plain.temporaryPassword!);
    expect(
      (await plainManager.post("/staff", { ...cashier, phone: randomPhone() })).statusCode,
    ).toBe(403);
    expect((await plainManager.get("/staff")).statusCode).toBe(403);
    // The add_staff manager lists only people at their locations.
    const listed = (await manager.get("/staff")).json<{ members: { role: string }[] }>().members;
    expect(listed.map((m) => m.role).sort()).toEqual(["cashier", "manager", "manager"]);
  });
});
