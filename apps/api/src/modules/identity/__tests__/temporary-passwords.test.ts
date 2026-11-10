import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addStaff, expectStatus, loginAs, ownerWithShop } from "../../../../test/business-fixtures";
import { NEW_PASSWORD, randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { TEMPORARY_PASSWORD_TTL_MS, isTemporaryPasswordExpired } from "../domain/auth-policy";

/** S1a security review #6 and temporary-password expiry. */
describe("temporary passwords", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  async function newCashier() {
    const biz = await ownerWithShop(t);
    const phone = randomPhone();
    const added = await addStaff(biz.owner, {
      name: "Brian Otieno",
      phone,
      role: "cashier",
      locationIds: [biz.shop.id],
    });
    return { ...biz, phone, member: added.member, temp: added.temporaryPassword };
  }

  /** Moves the temporary password's issue time back by `hours`. */
  const ageTemporaryPassword = (userId: string, hours: number) =>
    t.sql(
      "update users set temporary_password_issued_at = now() - make_interval(hours => $2) where id = $1",
      [userId, hours],
    );

  const failedCount = async (userId: string) =>
    (
      await t.sql<{ n: number }>("select failed_login_count as n from users where id = $1", [
        userId,
      ])
    )[0]!.n;

  it("until the password is changed, only me, change-password, logout and refresh work", async () => {
    const { phone, temp, tenantId, ownerMembershipId } = await newCashier();
    const cashier = await loginAs(t, phone, temp);
    expectStatus(await cashier.get("/auth/me"), 200);
    for (const res of [
      await cashier.get("/locations"),
      await cashier.get("/me/permissions"),
      await cashier.get("/business"),
      await cashier.get("/staff"),
      await cashier.post("/money-places", { type: "safe", name: "Safe", locationIds: [] }),
      await cashier.post(`/staff/${ownerMembershipId}/switch-off`),
      await cashier.post("/auth/select-business", { tenantId }),
    ]) {
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("password_change_required");
    }
    // Refresh keeps the session alive (still locked down); logout always works.
    const refreshed = expectStatus(await cashier.post("/auth/refresh"), 200);
    expect(refreshed.json().user.mustChangePassword).toBe(true);
    expect((await cashier.get("/locations")).json().error.code).toBe("password_change_required");
    const other = await loginAs(t, phone, temp);
    expectStatus(await other.post("/auth/logout"), 204);

    // Changing it unlocks the same session at once.
    expectStatus(
      await cashier.post("/auth/change-password", {
        currentPassword: temp,
        newPassword: NEW_PASSWORD,
      }),
      204,
    );
    expectStatus(await cashier.get("/locations"), 200);
    expectStatus(await cashier.get("/me/permissions"), 200);
  });

  it("a temporary password stops working after 72 hours (temporary_password_expired)", async () => {
    const { phone, temp, member } = await newCashier();
    await ageTemporaryPassword(member.userId, 71);
    expectStatus(
      await new TestClient(t.app).post("/auth/login", { identifier: phone, password: temp }),
      200,
    );

    await ageTemporaryPassword(member.userId, 72);
    const expired = await new TestClient(t.app).post("/auth/login", {
      identifier: phone,
      password: temp,
    });
    expect(expired.statusCode).toBe(401);
    expect(expired.json().error.code).toBe("temporary_password_expired");
    expect(expired.cookies.filter((c) => c.value !== "")).toEqual([]);
    // Knowing the password is not a guess: no lockout count. A wrong one still counts,
    // and does not learn that the temporary password expired.
    expect(await failedCount(member.userId)).toBe(0);
    const wrong = await new TestClient(t.app).post("/auth/login", {
      identifier: phone,
      password: "Wrong-Password-99",
    });
    expect(wrong.json().error.code).toBe("invalid_credentials");
    expect(await failedCount(member.userId)).toBe(1);
  });

  it("an open session cannot use an expired temporary password to change it", async () => {
    const { phone, temp, member } = await newCashier();
    const cashier = await loginAs(t, phone, temp);
    await ageTemporaryPassword(member.userId, 73);
    const res = await cashier.post("/auth/change-password", {
      currentPassword: temp,
      newPassword: NEW_PASSWORD,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("temporary_password_expired");
  });

  it("a reset gives a fresh 72 hours", async () => {
    const { owner, phone, member } = await newCashier();
    await ageTemporaryPassword(member.userId, 100);
    const reset = expectStatus(
      await owner.post(`/staff/${member.membershipId}/reset-password`),
      200,
    );
    const fresh = reset.json().temporaryPassword as string;
    const cashier = await loginAs(t, phone, fresh);
    expect((await cashier.get("/auth/me")).json().user.mustChangePassword).toBe(true);
  });

  it("isTemporaryPasswordExpired: only must-change passwords, from 72 hours on", () => {
    const issued = new Date("2026-11-01T08:00:00Z");
    const at = (ms: number) => new Date(issued.getTime() + ms);
    const temp = { mustChangePassword: true, temporaryPasswordIssuedAt: issued };
    expect(isTemporaryPasswordExpired(temp, at(TEMPORARY_PASSWORD_TTL_MS - 1))).toBe(false);
    expect(isTemporaryPasswordExpired(temp, at(TEMPORARY_PASSWORD_TTL_MS))).toBe(true);
    expect(TEMPORARY_PASSWORD_TTL_MS).toBe(72 * 3_600_000);
    const own = { mustChangePassword: false, temporaryPasswordIssuedAt: issued };
    expect(isTemporaryPasswordExpired(own, at(10 * TEMPORARY_PASSWORD_TTL_MS))).toBe(false);
    const legacy = { mustChangePassword: true, temporaryPasswordIssuedAt: null };
    expect(isTemporaryPasswordExpired(legacy, at(10 * TEMPORARY_PASSWORD_TTL_MS))).toBe(false);
  });
});
