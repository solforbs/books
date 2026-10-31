import { vi } from "vitest";

export interface MockResponse {
  status?: number;
  body?: unknown;
}

type Handler = MockResponse | ((init: RequestInit) => MockResponse);

/** Route table keyed by "METHOD /path" (path without the /api/v1 prefix). */
export type Routes = Record<string, Handler | Handler[]>;

export interface RecordedCall {
  method: string;
  path: string;
  init: RequestInit;
  body: unknown;
}

/**
 * Replaces global fetch with a fake API. A handler list is consumed in order (the last one
 * repeats), so tests can describe "401 first, then 200". Unknown routes answer 404.
 */
export function mockFetch(routes: Routes) {
  const calls: RecordedCall[] = [];
  const counters = new Map<string, number>();

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = String(input).replace(/^\/api\/v1/, "");
    const key = `${method} ${path}`;
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({ method, path, init, body });

    const entry = routes[key];
    const list = entry === undefined ? [] : Array.isArray(entry) ? entry : [entry];
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    const handler = list[Math.min(index, list.length - 1)];
    const result: MockResponse = handler
      ? typeof handler === "function"
        ? handler(init)
        : handler
      : { status: 404, body: { error: { code: "not_found", message: "Not found" } } };

    const status = result.status ?? 200;
    const text = result.body === undefined ? "" : JSON.stringify(result.body);
    return new Response(status === 204 ? null : text, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

export function apiError(status: number, code: string): MockResponse {
  return { status, body: { error: { code, message: code } } };
}
