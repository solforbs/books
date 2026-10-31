import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registration } from "../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../test/test-app";
import { TestClient } from "../../../test/test-client";

describe("HTTP cross-cutting concerns", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ AUTH_RATE_LIMIT_PER_MINUTE: "3" });
  });
  afterAll(() => t.close());

  it("GET /health reports the database status without any session or header", async () => {
    const res = await new TestClient(t.app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", db: "up" });
  });

  it("sets security headers (helmet)", async () => {
    const res = await new TestClient(t.app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
  });

  it.each(["/auth/register", "/auth/refresh", "/auth/logout", "/auth/recover"])(
    "POST %s without the x-books-client header is refused (CSRF)",
    async (url) => {
      const res = await new TestClient(t.app).post(url, registration(), { csrf: false });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({
        error: { code: "csrf_header_missing", message: expect.any(String) },
      });
    },
  );

  it("unknown routes use the standard error shape", async () => {
    const res = await new TestClient(t.app).get("/nope");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("not_found");
  });

  it("malformed JSON uses the standard error shape", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json", "x-books-client": "web" },
      payload: "{not json",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("bad_request");
  });

  it("accepts an empty body sent with a JSON content type (body-less POST such as logout)", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { "content-type": "application/json", "x-books-client": "web" },
      payload: "",
    });
    expect(res.statusCode).toBe(204);
  });

  it("rate-limits login attempts per IP with too_many_requests", async () => {
    const attempt = () =>
      new TestClient(t.app).post("/auth/login", {
        identifier: "0700000001",
        password: "Wrong-Password-99",
      });
    for (let i = 0; i < 3; i++) expect((await attempt()).statusCode).toBe(401);
    const limited = await attempt();
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("too_many_requests");
    // The general limit still lets other routes through.
    expect((await new TestClient(t.app).get("/health")).statusCode).toBe(200);
  });
});
