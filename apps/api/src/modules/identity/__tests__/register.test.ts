import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerResponseSchema } from "@books/shared";
import { PASSWORD, e164, randomEmail, randomPhone, registration } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

describe("POST /auth/register", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("registers with a phone only: business, owner membership, cookies, 10 recovery codes", async () => {
    const client = new TestClient(t.app);
    const phone = randomPhone();
    const res = await client.post("/auth/register", registration({ phone }));

    expect(res.statusCode).toBe(201);
    const body = registerResponseSchema.parse(res.json());
    expect(body.user.phone).toBe(e164(phone));
    expect(body.user.email).toBeNull();
    expect(body.recoveryCodes).toHaveLength(10);
    expect(new Set(body.recoveryCodes).size).toBe(10);
    expect(body.memberships).toEqual([
      { tenantId: body.activeTenantId, businessName: "Nuru Electronics", role: "owner" },
    ]);

    const at = res.cookies.find((c) => c.name === "books_at")!;
    const rt = res.cookies.find((c) => c.name === "books_rt")!;
    expect(at).toMatchObject({ path: "/api", httpOnly: true, sameSite: "Strict" });
    expect(rt).toMatchObject({ path: "/api/v1/auth", httpOnly: true, sameSite: "Strict" });
    expect(res.body).not.toContain(at.value);
    expect(res.body).not.toContain(rt.value);
  });

  it("registers with an email only (stored lower-case)", async () => {
    const email = randomEmail();
    const res = await new TestClient(t.app).post(
      "/auth/register",
      registration({ phone: undefined, email }),
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().user).toMatchObject({ phone: null, email: email.toLowerCase() });
  });

  it("rejects a registration with neither phone nor email", async () => {
    const res = await new TestClient(t.app).post(
      "/auth/register",
      registration({ phone: undefined }),
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("validation_failed");
    expect(res.json().error.details).toContainEqual({
      path: "phone",
      message: "phone_or_email_required",
    });
  });

  it.each(["short1A!", "alllowercaseletters", "password123", "Amina Hassan 2026!"])(
    "rejects the weak password %j",
    async (password) => {
      const res = await new TestClient(t.app).post("/auth/register", registration({ password }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
      expect(res.json().error.details).toContainEqual({
        path: "password",
        message: "weak_password",
      });
    },
  );

  it("rejects an invalid phone number", async () => {
    const res = await new TestClient(t.app).post("/auth/register", registration({ phone: "0812" }));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details).toContainEqual({ path: "phone", message: "invalid_phone" });
  });

  it("rejects a phone already registered, even written differently", async () => {
    const phone = randomPhone();
    await new TestClient(t.app).post("/auth/register", registration({ phone }));
    const spaced = `+254 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    const res = await new TestClient(t.app).post("/auth/register", registration({ phone: spaced }));
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: "identifier_taken", message: expect.any(String) },
    });
  });

  it("rejects an email already registered, ignoring case", async () => {
    const email = randomEmail();
    await new TestClient(t.app).post("/auth/register", registration({ phone: undefined, email }));
    const res = await new TestClient(t.app).post(
      "/auth/register",
      registration({ phone: undefined, email: email.toUpperCase() }),
    );
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("identifier_taken");
  });

  it("stores only hashes: no password, recovery code or full phone in the database", async () => {
    const phone = randomPhone();
    const res = await new TestClient(t.app).post("/auth/register", registration({ phone }));
    const { user, recoveryCodes } = res.json();

    const stored = await t.db.collection("users").findOne({ phone: e164(phone) });
    expect(stored!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);

    const codes = await t.db.collection("recovery_codes").find().toArray();
    const dump = JSON.stringify(codes);
    for (const code of recoveryCodes as string[]) expect(dump).not.toContain(code);

    const audit = await t.db.collection("audit_log").find({ action: "register" }).toArray();
    const mine = audit.find((a) => a.userId?.toHexString() === user.id)!;
    expect(mine.identifierMasked).toBe(`${e164(phone).slice(0, 7)}***${phone.slice(-3)}`);
    expect(JSON.stringify(audit)).not.toContain(e164(phone));
  });
});
