import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, mockFetch, type RecordedCall } from "@/test/mock-fetch";
import { makeSession } from "@/test/fixtures";
import { errorMessageKey } from "../error-message";
import { apiRequest } from "../http-client";

const expired = () => apiError(401, "session_expired");

/** A Web Locks stand-in: one exclusive queue per origin, shared by every "tab". */
function installFakeLocks() {
  const requested: string[] = [];
  let tail: Promise<unknown> = Promise.resolve();
  const locks = {
    request(name: string, callback: () => Promise<unknown>) {
      requested.push(name);
      const run = tail.then(() => callback());
      tail = run.catch(() => undefined);
      return run;
    },
  };
  Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
  return requested;
}

function removeLocks() {
  Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
}

/**
 * A server with one cookie jar shared by all tabs, like a real browser. Spending the same
 * refresh cookie twice is treated as theft: it logs everyone out.
 */
function fakeServer() {
  let valid = false;
  let spent = false;
  const guarded = () => (valid ? { body: { ok: true } } : expired());
  const { calls } = mockFetch({
    "GET /items": guarded,
    "GET /auth/me": () => (valid ? { body: makeSession() } : expired()),
    "POST /auth/refresh": () => {
      if (spent) {
        valid = false;
        return apiError(401, "not_authenticated");
      }
      spent = true;
      valid = true;
      return { body: makeSession() };
    },
  });
  return calls;
}

const refreshCalls = (calls: RecordedCall[]) => calls.filter((c) => c.path === "/auth/refresh");
const trace = (calls: RecordedCall[]) => calls.map((c) => `${c.method} ${c.path}`);

/** Each import after a module reset is a separate tab with its own in-memory state. */
async function openTab() {
  vi.resetModules();
  return import("../http-client");
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "locks");
});

describe("session refresh", () => {
  it("serialises refresh across two tabs so the refresh cookie is spent only once", async () => {
    const locks = installFakeLocks();
    const calls = fakeServer();
    const [tabA, tabB] = [await openTab(), await openTab()];

    const results = await Promise.all([tabA.apiRequest("/items"), tabB.apiRequest("/items")]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls(calls)).toHaveLength(1);
    expect(locks).toEqual(["books-refresh", "books-refresh"]);
  });

  it("re-checks /auth/me inside the lock and skips refresh when the session is valid", async () => {
    installFakeLocks();
    const { calls } = mockFetch({
      "GET /items": [expired(), { body: { ok: true } }],
      "GET /auth/me": { body: makeSession() },
    });
    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });
    expect(trace(calls)).toEqual(["GET /items", "GET /auth/me", "GET /items"]);
  });

  it("refreshes once and retries the original request", async () => {
    installFakeLocks();
    const calls = fakeServer();
    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });
    expect(trace(calls)).toEqual([
      "GET /items",
      "GET /auth/me",
      "POST /auth/refresh",
      "GET /items",
    ]);
  });

  it("on 409 refresh_in_progress, re-checks /auth/me and retries without logging out", async () => {
    installFakeLocks();
    const { calls } = mockFetch({
      "GET /items": [expired(), { body: { ok: true } }],
      "GET /auth/me": [expired(), { body: makeSession() }],
      "POST /auth/refresh": apiError(409, "refresh_in_progress"),
    });
    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });
    expect(trace(calls)).toEqual([
      "GET /items",
      "GET /auth/me",
      "POST /auth/refresh",
      "GET /auth/me",
      "GET /items",
    ]);
  });

  it("reports refresh_in_progress (not an expired session) when the other tab is still busy", async () => {
    installFakeLocks();
    const { calls } = mockFetch({
      "GET /items": expired(),
      "GET /auth/me": expired(),
      "POST /auth/refresh": apiError(409, "refresh_in_progress"),
    });
    const error = await apiRequest("/items").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 409, code: "refresh_in_progress" });
    expect(errorMessageKey(error)).toBe("errors.refresh_in_progress");
    expect(refreshCalls(calls)).toHaveLength(1);
    expect(calls.some((c) => c.path === "/auth/logout")).toBe(false);
  });

  it("returns the original error when the refresh really fails", async () => {
    installFakeLocks();
    const { calls } = mockFetch({
      "GET /items": expired(),
      "GET /auth/me": expired(),
      "POST /auth/refresh": apiError(401, "not_authenticated"),
    });
    await expect(apiRequest("/items")).rejects.toMatchObject({ code: "session_expired" });
    expect(calls).toHaveLength(3);
  });

  it("falls back to one refresh per tab when Web Locks are unavailable", async () => {
    removeLocks();
    const calls = fakeServer();
    const tab = await openTab();

    const results = await Promise.all([tab.apiRequest("/items"), tab.apiRequest("/items")]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls(calls)).toHaveLength(1);
  });
});
