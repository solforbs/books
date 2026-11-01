import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NEW_PASSWORD, PASSWORD, e164, registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { MAX_FAILED_LOGINS } from "../domain/auth-policy";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { users } from "../infrastructure/tables/users.table";

const WRONG = "Wrong-Password-99";

describe("atomic lockout (M2) shared with change-password (L3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  afterEach(() => vi.restoreAllMocks());

  const login = (identifier: string, password: string) =>
    new TestClient(t.app).post("/auth/login", { identifier, password });
  const userDoc = async (phone: string) =>
    (
      await t.db
        .select()
        .from(users)
        .where(eq(users.phone, e164(phone)))
    )[0];

  it("10 parallel wrong passwords: at most 5 are verified, the rest get account_locked", async () => {
    const { request } = await registerOwner(new TestClient(t.app));
    const phone = request.phone!;
    const verify = vi.spyOn(t.app.get(PasswordHasher), "verify");

    const results = await Promise.all(Array.from({ length: 10 }, () => login(phone, WRONG)));
    const codes = results.map((r) => r.json().error.code);

    expect(verify).toHaveBeenCalledTimes(MAX_FAILED_LOGINS);
    expect(codes.filter((c) => c === "invalid_credentials")).toHaveLength(MAX_FAILED_LOGINS);
    expect(codes.filter((c) => c === "account_locked")).toHaveLength(10 - MAX_FAILED_LOGINS);
    expect((await userDoc(phone))?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    // Even the right password is refused while locked, without running argon2.
    verify.mockClear();
    const locked = await login(phone, PASSWORD);
    expect(locked.statusCode).toBe(423);
    expect(locked.json().error.code).toBe("account_locked");
    expect(verify).not.toHaveBeenCalled();
  });

  it("the right password as the 5th attempt still logs in and clears the counter", async () => {
    const { request } = await registerOwner(new TestClient(t.app));
    const phone = request.phone!;
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await login(phone, WRONG);
    expect((await login(phone, PASSWORD)).statusCode).toBe(200);
    const user = await userDoc(phone);
    expect(user).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
  });

  it("unknown identifiers still cost one (dummy) hash and never lock anything", async () => {
    const verify = vi.spyOn(t.app.get(PasswordHasher), "verifyAgainstDummy");
    const res = await login("0799000111", WRONG);
    expect(res.json().error.code).toBe("invalid_credentials");
    expect(verify).toHaveBeenCalledTimes(1);
  });

  describe("change-password", () => {
    const change = (client: TestClient, currentPassword: string) =>
      client.post("/auth/change-password", { currentPassword, newPassword: NEW_PASSWORD });

    it("wrong current passwords count toward the same lockout as login", async () => {
      const client = new TestClient(t.app);
      const { request } = await registerOwner(client);
      for (let i = 0; i < MAX_FAILED_LOGINS - 2; i++) {
        expect((await change(client, WRONG)).json().error.code).toBe("invalid_credentials");
      }
      await login(request.phone!, WRONG);
      expect((await change(client, WRONG)).json().error.code).toBe("invalid_credentials");

      const lockedChange = await change(client, PASSWORD);
      expect(lockedChange.statusCode).toBe(423);
      expect(lockedChange.json().error.code).toBe("account_locked");
      expect((await login(request.phone!, PASSWORD)).json().error.code).toBe("account_locked");
    });

    it("a right current password clears earlier failures", async () => {
      const client = new TestClient(t.app);
      const { request } = await registerOwner(client);
      for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await change(client, WRONG);
      expect((await change(client, PASSWORD)).statusCode).toBe(204);
      expect((await userDoc(request.phone!))?.failedLoginCount).toBe(0);
    });
  });
});

describe("change-password uses the strict auth rate limit (L3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ AUTH_RATE_LIMIT_PER_MINUTE: "3" });
  });
  afterAll(() => t.close());

  it("the 4th attempt in a minute from one IP (limit 3) is too_many_requests", async () => {
    // The limit is per route and IP. 3 wrong guesses stay under the 5-strike lockout.
    const client = new TestClient(t.app);
    await registerOwner(client);
    const attempt = () =>
      client.post("/auth/change-password", { currentPassword: WRONG, newPassword: NEW_PASSWORD });
    for (let i = 0; i < 3; i++) expect((await attempt()).statusCode).toBe(400);
    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("too_many_requests");
  });
});
