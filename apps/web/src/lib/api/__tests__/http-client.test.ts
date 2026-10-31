import { CLIENT_HEADER, CLIENT_HEADER_VALUE, sessionResponseSchema } from "@books/shared";
import { describe, expect, it, vi } from "vitest";
import { apiError, mockFetch } from "@/test/mock-fetch";
import { makeSession } from "@/test/fixtures";
import { ApiError } from "../api-error";
import { errorMessageKey } from "../error-message";
import { apiRequest } from "../http-client";

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

describe("apiRequest", () => {
  it("sends cookies and the CSRF header on state-changing requests", async () => {
    const { calls } = mockFetch({ "POST /auth/login": { body: makeSession() } });
    await apiRequest("/auth/login", { method: "POST", body: { identifier: "x", password: "y" } });

    const [call] = calls;
    expect(call?.init.credentials).toBe("include");
    expect(headersOf(call!.init)[CLIENT_HEADER]).toBe(CLIENT_HEADER_VALUE);
    expect(call?.body).toEqual({ identifier: "x", password: "y" });
  });

  it("sends cookies but no CSRF header on GET", async () => {
    const { calls } = mockFetch({ "GET /auth/me": { body: makeSession() } });
    await apiRequest("/auth/me");
    expect(calls[0]?.init.credentials).toBe("include");
    expect(headersOf(calls[0]!.init)[CLIENT_HEADER]).toBeUndefined();
  });

  it("validates the response with the shared schema", async () => {
    mockFetch({ "GET /auth/me": { body: { user: "not a user" } } });
    await expect(apiRequest("/auth/me", { schema: sessionResponseSchema })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("maps API error bodies to a typed ApiError", async () => {
    mockFetch({ "POST /auth/login": apiError(401, "invalid_credentials") });
    const error = await apiRequest("/auth/login", { method: "POST", skipRefresh: true }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: "invalid_credentials" });
    expect(errorMessageKey(error)).toBe("errors.invalid_credentials");
  });

  it("gives unknown codes and odd bodies a generic message", async () => {
    mockFetch({ "GET /x": { status: 500, body: "<html>oops</html>" } });
    const error = await apiRequest("/x").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 500, code: "unknown" });
    expect(errorMessageKey(new ApiError(400, "brand_new_code", "?"))).toBe("errors.unknown");
  });

  it("reports a network failure as network_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/auth/me")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });

  it("does not refresh when told to skip it (wrong password is not an expired session)", async () => {
    const { calls } = mockFetch({ "POST /auth/login": apiError(401, "invalid_credentials") });
    await expect(
      apiRequest("/auth/login", { method: "POST", skipRefresh: true }),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(calls).toHaveLength(1);
  });
});
