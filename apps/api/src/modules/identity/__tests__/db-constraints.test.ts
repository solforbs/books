import { count, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  NEW_PASSWORD,
  e164,
  randomPhone,
  registerOwner,
  registration,
} from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { tenants } from "../infrastructure/tables/tenants.table";
import { users } from "../infrastructure/tables/users.table";
import { UsersRepository } from "../infrastructure/users.repository";

/** Database constraints and row locks behind the API's guarantees (PostgreSQL). */
describe("identity: constraints and concurrency in PostgreSQL", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  afterEach(() => vi.restoreAllMocks());

  const tenantCount = async () => (await t.db.select({ n: count() }).from(tenants))[0]!.n;

  it("parallel sign-ups with one phone: exactly one wins, the rest get 409 identifier_taken", async () => {
    const phone = randomPhone();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        new TestClient(t.app).post("/auth/register", registration({ phone })),
      ),
    );
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409, 409]);
    for (const r of results.filter((x) => x.statusCode === 409)) {
      expect(r.json().error.code).toBe("identifier_taken");
    }
    expect(
      await t.db
        .select()
        .from(users)
        .where(eq(users.phone, e164(phone))),
    ).toHaveLength(1);
  });

  it("a unique violation inside the sign-up transaction maps to 409 and leaves nothing behind", async () => {
    const { request } = await registerOwner(new TestClient(t.app));
    const before = await tenantCount();
    // Skip the friendly pre-check so the insert itself hits the unique index.
    vi.spyOn(t.app.get(UsersRepository), "existsWith").mockResolvedValue(false);

    const res = await new TestClient(t.app).post(
      "/auth/register",
      registration({ phone: request.phone, businessName: "Second Shop" }),
    );
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: "identifier_taken", message: expect.any(String) },
    });
    expect(await tenantCount()).toBe(before);
  });

  it("one recovery code used by 5 requests at once works exactly once", async () => {
    const { request, response } = await registerOwner(new TestClient(t.app));
    const recover = () =>
      new TestClient(t.app).post("/auth/recover", {
        identifier: request.phone,
        recoveryCode: response.recoveryCodes[0],
        newPassword: NEW_PASSWORD,
      });
    const results = await Promise.all(Array.from({ length: 5 }, recover));
    expect(results.filter((r) => r.statusCode === 204)).toHaveLength(1);
    for (const r of results.filter((x) => x.statusCode !== 204)) {
      expect(r.json().error.code).toBe("invalid_recovery_code");
    }
    const login = await new TestClient(t.app).post("/auth/login", {
      identifier: request.phone,
      password: NEW_PASSWORD,
    });
    expect(login.statusCode).toBe(200);
  });
});
