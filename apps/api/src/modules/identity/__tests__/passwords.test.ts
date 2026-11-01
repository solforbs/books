import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NEW_PASSWORD, PASSWORD, e164, registerOwner } from "../../../../test/fixtures";
import { users } from "../infrastructure/tables/users.table";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

describe("change-password and recover", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const login = (identifier: string, password: string) =>
    new TestClient(t.app).post("/auth/login", { identifier, password });

  describe("POST /auth/change-password", () => {
    it("changes the password, clears mustChangePassword and signs out other sessions only", async () => {
      const client = new TestClient(t.app);
      const { request } = await registerOwner(client);
      const phone = request.phone!;
      await t.db
        .update(users)
        .set({ mustChangePassword: true })
        .where(eq(users.phone, e164(phone)));
      const otherDevice = new TestClient(t.app);
      await otherDevice.post("/auth/login", { identifier: phone, password: PASSWORD });
      expect((await client.get("/auth/me")).json().user.mustChangePassword).toBe(true);

      const res = await client.post("/auth/change-password", {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });
      expect(res.statusCode).toBe(204);

      expect((await client.get("/auth/me")).json().user.mustChangePassword).toBe(false);
      expect((await otherDevice.get("/auth/me")).json().error.code).toBe("session_expired");
      expect((await login(phone, PASSWORD)).statusCode).toBe(401);
      expect((await login(phone, NEW_PASSWORD)).statusCode).toBe(200);
    });

    it("rejects a wrong current password", async () => {
      const client = new TestClient(t.app);
      await registerOwner(client);
      const res = await client.post("/auth/change-password", {
        currentPassword: "Not-The-Password-1",
        newPassword: NEW_PASSWORD,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("invalid_credentials");
    });

    it("enforces the shared password policy, including the user's own name", async () => {
      const client = new TestClient(t.app);
      await registerOwner(client, { ownerName: "Wanjiru Kamau" });
      for (const newPassword of ["weakpass", "Wanjiru-Kamau-2026!"]) {
        const res = await client.post("/auth/change-password", {
          currentPassword: PASSWORD,
          newPassword,
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error.code).toBe("validation_failed");
      }
    });

    it("requires a session", async () => {
      const res = await new TestClient(t.app).post("/auth/change-password", {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });
      expect(res.json().error.code).toBe("not_authenticated");
    });
  });

  describe("POST /auth/recover", () => {
    it("resets the password with a recovery code and signs out every session", async () => {
      const client = new TestClient(t.app);
      const { request, response } = await registerOwner(client);
      const phone = request.phone!;

      const res = await new TestClient(t.app).post("/auth/recover", {
        identifier: phone,
        recoveryCode: response.recoveryCodes[3],
        newPassword: NEW_PASSWORD,
      });
      expect(res.statusCode).toBe(204);
      expect((await client.get("/auth/me")).json().error.code).toBe("session_expired");
      expect((await login(phone, PASSWORD)).statusCode).toBe(401);
      expect((await login(phone, NEW_PASSWORD)).statusCode).toBe(200);
    });

    it("accepts a code typed in lower case without dashes; each code works only once", async () => {
      const { request, response } = await registerOwner(new TestClient(t.app));
      const typed = response.recoveryCodes[0]!.toLowerCase().replace(/-/g, "");
      const recover = (recoveryCode: string) =>
        new TestClient(t.app).post("/auth/recover", {
          identifier: request.phone,
          recoveryCode,
          newPassword: NEW_PASSWORD,
        });

      expect((await recover(typed)).statusCode).toBe(204);
      const reused = await recover(response.recoveryCodes[0]!);
      expect(reused.statusCode).toBe(400);
      expect(reused.json().error.code).toBe("invalid_recovery_code");
      // Another, unused code still works.
      expect((await recover(response.recoveryCodes[1]!)).statusCode).toBe(204);
    });

    it("gives the same error for a wrong code, another user's code and an unknown user", async () => {
      const a = await registerOwner(new TestClient(t.app));
      const b = await registerOwner(new TestClient(t.app));
      const attempt = (identifier: string, recoveryCode: string) =>
        new TestClient(t.app).post("/auth/recover", {
          identifier,
          recoveryCode,
          newPassword: NEW_PASSWORD,
        });

      const wrong = await attempt(a.request.phone!, "AAAA-BBBB-CCCC-DDDD");
      const othersCode = await attempt(a.request.phone!, b.response.recoveryCodes[0]!);
      const unknown = await attempt("0799999999", a.response.recoveryCodes[0]!);
      for (const res of [wrong, othersCode, unknown]) {
        expect(res.statusCode).toBe(400);
        expect(res.json().error.code).toBe("invalid_recovery_code");
      }
      expect(othersCode.body).toBe(wrong.body);
      expect(unknown.body).toBe(wrong.body);
      // Nothing changed for A.
      expect((await login(a.request.phone!, PASSWORD)).statusCode).toBe(200);
    });

    it("rejects a new password built from the user's name or email, and keeps the code unused", async () => {
      const email = `wanjiku.otieno${Date.now()}@example.com`;
      const { request, response } = await registerOwner(new TestClient(t.app), {
        ownerName: "Wanjiku Otieno",
        email,
      });
      const recover = (newPassword: string) =>
        new TestClient(t.app).post("/auth/recover", {
          identifier: request.phone,
          recoveryCode: response.recoveryCodes[2],
          newPassword,
        });
      const emailPrefix = email.split("@")[0]!;
      for (const weak of ["Otieno-Duka-2026!", `X-${emailPrefix}-9!`]) {
        const res = await recover(weak);
        expect(res.statusCode, weak).toBe(400);
        expect(res.json().error).toMatchObject({
          code: "validation_failed",
          details: [{ path: "newPassword", message: "weak_password" }],
        });
      }
      // Nothing changed: old password works, and the same code still resets it.
      expect((await login(request.phone!, PASSWORD)).statusCode).toBe(200);
      expect((await recover(NEW_PASSWORD)).statusCode).toBe(204);
    });

    it("an unknown user with a name-like password still gets invalid_recovery_code (no enumeration)", async () => {
      const res = await new TestClient(t.app).post("/auth/recover", {
        identifier: "0799111222",
        recoveryCode: "AAAA-BBBB-CCCC-DDDD",
        newPassword: "Otieno-Duka-2026!",
      });
      expect(res.json().error.code).toBe("invalid_recovery_code");
    });

    it("also lifts a lockout", async () => {
      const { request, response } = await registerOwner(new TestClient(t.app));
      for (let i = 0; i < 5; i++) await login(request.phone!, "Wrong-Password-99");
      expect((await login(request.phone!, PASSWORD)).json().error.code).toBe("account_locked");

      await new TestClient(t.app).post("/auth/recover", {
        identifier: request.phone,
        recoveryCode: response.recoveryCodes[9],
        newPassword: NEW_PASSWORD,
      });
      expect((await login(request.phone!, NEW_PASSWORD)).statusCode).toBe(200);
    });
  });
});
