import { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerOwner } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";
import { MAX_SESSION_LIFETIME_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "../domain/auth-policy";
import { REFRESH_SESSION_PURGE_AFTER_SECONDS } from "../infrastructure/schemas/refresh-session.schema";
import { TokenService } from "../infrastructure/token-service";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("refresh: parallel tabs (M4) and session lifetime (L5)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const sessions = () => t.db.collection("refresh_sessions");
  const hashOf = (rt: string) => t.app.get(TokenService).hashRefreshToken(rt);
  const refreshWith = (rt: string) =>
    new TestClient(t.app).post("/auth/refresh", undefined, { cookies: { books_rt: rt } });

  it("a second tab replaying the just-rotated token gets 409 refresh_in_progress; nothing is revoked", async () => {
    const tabA = new TestClient(t.app);
    const { response } = await registerOwner(tabA);
    const shared = tabA.jar.get("books_rt")!;

    expect((await tabA.post("/auth/refresh")).statusCode).toBe(200);
    const tabB = await refreshWith(shared);
    expect(tabB.statusCode).toBe(409);
    expect(tabB.json().error.code).toBe("refresh_in_progress");
    // The losing tab must not wipe the fresh cookies the winning tab just got.
    expect(tabB.cookies).toHaveLength(0);

    expect((await tabA.get("/auth/me")).statusCode).toBe(200);
    expect((await tabA.post("/auth/refresh")).statusCode).toBe(200);
    const reuse = await t.db.collection("audit_log").countDocuments({
      action: "refresh_token_reuse",
      userId: new Types.ObjectId(response.user.id),
    });
    expect(reuse).toBe(0);
  });

  it("simultaneous refreshes with one token: exactly one rotates, the others get 409", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const rt = client.jar.get("books_rt")!;

    const results = await Promise.all(Array.from({ length: 5 }, () => refreshWith(rt)));
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([200, 409, 409, 409, 409]);

    const winner = results.find((r) => r.statusCode === 200)!;
    const newRt = winner.cookies.find((c) => c.name === "books_rt")!.value;
    expect((await refreshWith(newRt)).statusCode).toBe(200);
  });

  it("outside the 30 s window the same replay is treated as theft: family revoked", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const old = client.jar.get("books_rt")!;
    expect((await client.post("/auth/refresh")).statusCode).toBe(200);
    await sessions().updateOne(
      { tokenHash: hashOf(old) },
      { $set: { usedAt: new Date(Date.now() - 30_001) } },
    );

    const replay = await refreshWith(old);
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe("session_expired");
    expect((await client.get("/auth/me")).json().error.code).toBe("session_expired");
  });

  it("a revoked family gets no grace even inside the window", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const old = client.jar.get("books_rt")!;
    expect((await client.post("/auth/refresh")).statusCode).toBe(200);
    expect((await client.post("/auth/logout")).statusCode).toBe(204);
    expect((await refreshWith(old)).json().error.code).toBe("session_expired");
  });

  it("stores the family start and never extends a session past 90 days", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const rt = client.jar.get("books_rt")!;
    const startedAt = new Date(Date.now() - 89 * DAY_MS);
    await sessions().updateOne({ tokenHash: hashOf(rt) }, { $set: { familyStartedAt: startedAt } });

    expect((await client.post("/auth/refresh")).statusCode).toBe(200);
    const next = await sessions().findOne({ tokenHash: hashOf(client.jar.get("books_rt")!) });
    expect(next?.familyStartedAt).toEqual(startedAt);
    const cap = startedAt.getTime() + MAX_SESSION_LIFETIME_SECONDS * 1000;
    expect(next?.expiresAt.getTime()).toBe(cap);
    expect(cap).toBeLessThan(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  });

  it("refuses to refresh a family older than 90 days", async () => {
    const client = new TestClient(t.app);
    await registerOwner(client);
    const rt = client.jar.get("books_rt")!;
    await sessions().updateOne(
      { tokenHash: hashOf(rt) },
      { $set: { familyStartedAt: new Date(Date.now() - 91 * DAY_MS) } },
    );
    const res = await client.post("/auth/refresh");
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("session_expired");
    expect((await client.get("/auth/me")).statusCode).toBe(401);
  });

  it("purges refresh_sessions documents a week after they expire (TTL index)", async () => {
    const indexes = await sessions().listIndexes().toArray();
    const ttl = indexes.find((i) => i.key.expiresAt === 1);
    expect(ttl?.expireAfterSeconds).toBe(REFRESH_SESSION_PURGE_AFTER_SECONDS);
    expect(REFRESH_SESSION_PURGE_AFTER_SECONDS).toBe(7 * 24 * 60 * 60);
  });
});
