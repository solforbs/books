import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sessionResponseSchema } from "@books/shared";
import { PASSWORD, registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

describe("sessions: me, refresh, logout", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("GET /auth/me returns the session for a logged-in user", async () => {
    const client = new TestClient(t.app);
    const { response } = await registerOwner(client);
    const res = await client.get("/auth/me");
    expect(res.statusCode).toBe(200);
    const body = sessionResponseSchema.parse(res.json());
    expect(body).toEqual({
      user: response.user,
      memberships: response.memberships,
      activeTenantId: response.activeTenantId,
    });
  });

  it("GET /auth/me without a cookie is not_authenticated; a forged token too", async () => {
    const anon = await new TestClient(t.app).get("/auth/me");
    expect(anon.statusCode).toBe(401);
    expect(anon.json().error.code).toBe("not_authenticated");

    const forged = await new TestClient(t.app).get("/auth/me", {
      cookies: { books_at: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad" },
    });
    expect(forged.json().error.code).toBe("not_authenticated");
  });

  it("refresh rotates both tokens and keeps the session", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const oldRt = client.jar.get("books_rt")!;

    const res = await client.post("/auth/refresh");
    expect(res.statusCode).toBe(200);
    sessionResponseSchema.parse(res.json());
    const newRt = client.jar.get("books_rt")!;
    expect(newRt).not.toBe(oldRt);
    expect((await client.get("/auth/me")).statusCode).toBe(200);
    expect((await client.post("/auth/refresh")).statusCode).toBe(200);
  });

  it("reusing an old refresh token revokes the whole session family", async () => {
    const victim = new TestClient(t.app);
    await registerOwner(victim);
    const stolenRt = victim.jar.get("books_rt")!;

    // The real user refreshes; the stolen token is now "used".
    expect((await victim.post("/auth/refresh")).statusCode).toBe(200);

    // The attacker replays the stolen token.
    const replay = await new TestClient(t.app).post("/auth/refresh", undefined, {
      cookies: { books_rt: stolenRt },
    });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe("session_expired");

    // Everyone in that family is out: the victim's current tokens stop working too.
    const me = await victim.get("/auth/me");
    expect(me.statusCode).toBe(401);
    expect(me.json().error.code).toBe("session_expired");
    expect((await victim.post("/auth/refresh")).statusCode).toBe(401);

    const reuse = await t.db.collection("audit_log").findOne({ action: "refresh_token_reuse" });
    expect(reuse).not.toBeNull();
  });

  it("refresh without a cookie, or with garbage, is session_expired and clears cookies", async () => {
    const none = await new TestClient(t.app).post("/auth/refresh");
    expect(none.statusCode).toBe(401);
    expect(none.json().error.code).toBe("session_expired");

    const junk = await new TestClient(t.app).post("/auth/refresh", undefined, {
      cookies: { books_rt: "not-a-real-token" },
    });
    expect(junk.json().error.code).toBe("session_expired");
    expect(junk.cookies.find((c) => c.name === "books_rt")?.value).toBe("");
  });

  it("logout ends the session: cookies cleared, old tokens rejected", async () => {
    const client = new TestClient(t.app);
    const { request } = await registerOwner(client);
    const at = client.jar.get("books_at")!;
    const rt = client.jar.get("books_rt")!;

    const res = await client.post("/auth/logout");
    expect(res.statusCode).toBe(204);
    expect(client.jar.size).toBe(0);

    const meWithOldAt = await new TestClient(t.app).get("/auth/me", { cookies: { books_at: at } });
    expect(meWithOldAt.json().error.code).toBe("session_expired");
    const refreshWithOldRt = await new TestClient(t.app).post("/auth/refresh", undefined, {
      cookies: { books_rt: rt },
    });
    expect(refreshWithOldRt.statusCode).toBe(401);

    // Other sessions of the same user are unaffected by this logout.
    const again = await new TestClient(t.app).post("/auth/login", {
      identifier: request.phone,
      password: PASSWORD,
    });
    expect(again.statusCode).toBe(200);
  });

  it("logout without any session still succeeds", async () => {
    expect((await new TestClient(t.app).post("/auth/logout")).statusCode).toBe(204);
  });
});
