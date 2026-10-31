import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sessionResponseSchema } from "@books/shared";
import { PASSWORD, e164, randomEmail, randomPhone, registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

describe("POST /auth/login", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const login = (identifier: string, password: string) =>
    new TestClient(t.app).post("/auth/login", { identifier, password });

  it("logs in by phone written in any common format, and auto-selects the only business", async () => {
    const phone = randomPhone();
    const { response } = await registerOwner(new TestClient(t.app), { phone });

    for (const written of [phone, e164(phone), `${phone.slice(0, 4)} ${phone.slice(4)}`]) {
      const res = await login(written, PASSWORD);
      expect(res.statusCode).toBe(200);
      const body = sessionResponseSchema.parse(res.json());
      expect(body.user.id).toBe(response.user.id);
      expect(body.activeTenantId).toBe(response.activeTenantId);
      expect(res.cookies.map((c) => c.name).sort()).toEqual(["books_at", "books_rt"]);
    }
  });

  it("logs in by email, ignoring case", async () => {
    const email = randomEmail();
    await registerOwner(new TestClient(t.app), { phone: undefined, email });
    const res = await login(email.toUpperCase(), PASSWORD);
    expect(res.statusCode).toBe(200);
  });

  it("gives the identical error for a wrong password and an unknown user (no enumeration)", async () => {
    const phone = randomPhone();
    await registerOwner(new TestClient(t.app), { phone });

    const wrong = await login(phone, "Wrong-Password-99");
    const unknown = await login(randomPhone(), "Wrong-Password-99");
    const unknownEmail = await login("nobody@example.com", "Wrong-Password-99");

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrong.json()).toEqual({
      error: { code: "invalid_credentials", message: expect.any(String) },
    });
    expect(unknown.body).toBe(wrong.body);
    expect(unknownEmail.body).toBe(wrong.body);
    expect(wrong.cookies).toHaveLength(0);
  });

  it("locks the account for 15 minutes after 5 failures in a row, then lets it in again", async () => {
    const phone = randomPhone();
    await registerOwner(new TestClient(t.app), { phone });

    for (let i = 0; i < 5; i++) {
      expect((await login(phone, "Wrong-Password-99")).json().error.code).toBe(
        "invalid_credentials",
      );
    }
    const locked = await login(phone, PASSWORD);
    expect(locked.statusCode).toBe(423);
    expect(locked.json().error.code).toBe("account_locked");
    expect(locked.json().error.details.retryAfterSeconds).toBeGreaterThan(14 * 60);

    // Time passes: move the lock into the past.
    await t.db
      .collection("users")
      .updateOne({ phone: e164(phone) }, { $set: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await login(phone, PASSWORD)).statusCode).toBe(200);
  });

  it("a successful login resets the failure counter", async () => {
    const phone = randomPhone();
    await registerOwner(new TestClient(t.app), { phone });
    for (let i = 0; i < 4; i++) await login(phone, "Wrong-Password-99");
    expect((await login(phone, PASSWORD)).statusCode).toBe(200);
    for (let i = 0; i < 4; i++) await login(phone, "Wrong-Password-99");
    expect((await login(phone, PASSWORD)).statusCode).toBe(200);
  });

  it("writes masked audit entries for success and failure, never the password", async () => {
    const phone = randomPhone();
    const { response } = await registerOwner(new TestClient(t.app), { phone });
    await login(phone, "Wrong-Password-99");
    await login(phone, PASSWORD);

    const entries = (await t.db.collection("audit_log").find({ action: "login" }).toArray()).filter(
      (e) => e.userId?.toHexString() === response.user.id,
    );
    expect(entries.map((e) => e.identifierMasked)).toEqual([
      `+254******${phone.slice(-3)}`,
      `+254******${phone.slice(-3)}`,
    ]);
    expect(entries.map((e) => e.outcome).sort()).toEqual(["failure", "success"]);
    const dump = JSON.stringify(entries);
    expect(dump).not.toContain("Wrong-Password-99");
    expect(dump).not.toContain(PASSWORD);
    expect(dump).not.toContain(e164(phone));
  });

  it("validates the request body", async () => {
    const res = await new TestClient(t.app).post("/auth/login", { identifier: "07" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("validation_failed");
  });
});
