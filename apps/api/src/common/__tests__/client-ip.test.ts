import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@books/shared";
import { createTestApp, type TestApp } from "../../../test/test-app";
import { auditLog } from "../../modules/audit/infrastructure/audit-log.table";

/**
 * Production: internet -> host web server -> container nginx -> API, with
 * TRUST_PROXY=1. nginx sets X-Forwarded-For to "<whatever the client sent>,
 * <real client IP>", so only the right-most entry may be believed.
 */
describe("client IP behind one trusted proxy hop (TRUST_PROXY=1)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ TRUST_PROXY: "1", AUTH_RATE_LIMIT_PER_MINUTE: "3" });
  });
  afterAll(() => t.close());

  const login = (xff: string, identifier = "0700000002", remoteAddress = "172.18.0.5") =>
    t.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      // The socket peer stands in for the container nginx on the Docker network.
      remoteAddress,
      headers: { [CLIENT_HEADER]: CLIENT_HEADER_VALUE, "x-forwarded-for": xff },
      payload: { identifier, password: "Wrong-Password-99" },
    });
  const lastLoginIp = async () =>
    (
      await t.db
        .select({ ip: auditLog.ip })
        .from(auditLog)
        .where(eq(auditLog.action, "login"))
        .orderBy(desc(auditLog.at))
        .limit(1)
    )[0]?.ip;

  it("uses the right-most X-Forwarded-For entry, ignoring a forged left-most one", async () => {
    const res = await login("6.6.6.6, 41.90.1.2", "0700000099");
    expect(res.statusCode).toBe(401);
    expect(await lastLoginIp()).toBe("41.90.1.2");
  });

  it("ignores X-Forwarded-For from a peer that is not on a private network", async () => {
    await login("41.90.5.5", "0700000098", "8.8.4.4");
    expect(await lastLoginIp()).toBe("8.8.4.4");
  });

  it("rate-limits by the real client IP: forging a new left-most entry does not reset the limit", async () => {
    // Earlier test used one attempt from 41.90.1.2; two more reach the limit of 3.
    expect((await login("1.1.1.1, 41.90.1.2")).statusCode).toBe(401);
    expect((await login("2.2.2.2, 41.90.1.2")).statusCode).toBe(401);
    const limited = await login("3.3.3.3, 41.90.1.2");
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("too_many_requests");
  });

  it("two different real clients get independent login limits", async () => {
    for (let i = 0; i < 3; i++) expect((await login(`41.90.7.7`)).statusCode).toBe(401);
    expect((await login("41.90.7.7")).statusCode).toBe(429);
    // Another customer behind the same proxy (same forged prefix) is not affected.
    expect((await login("6.6.6.6, 41.90.8.8")).statusCode).toBe(401);
  });
});
