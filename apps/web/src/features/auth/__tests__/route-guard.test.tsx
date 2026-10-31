import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeSession } from "@/test/fixtures";
import { apiError, mockFetch } from "@/test/mock-fetch";
import { renderApp } from "@/test/render-app";

describe("route guard", () => {
  it("sends a visitor without a session to the login page", async () => {
    const { calls } = mockFetch({
      "GET /auth/me": apiError(401, "not_authenticated"),
      "POST /auth/refresh": apiError(401, "not_authenticated"),
    });
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    // The second /auth/me is the cross-tab re-check made inside the refresh lock.
    expect(calls.map((c) => c.path)).toEqual(["/auth/me", "/auth/me", "/auth/refresh"]);
  });

  it("restores the session on load after refreshing an expired token", async () => {
    const expired = apiError(401, "session_expired");
    const { calls } = mockFetch({
      "GET /auth/me": [expired, expired, { body: makeSession() }],
      "POST /auth/refresh": { body: makeSession() },
    });
    renderApp("/");
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
    expect(calls.filter((c) => c.path === "/auth/refresh")).toHaveLength(1);
  });

  it("keeps a logged-in person away from the login page", async () => {
    mockFetch({ "GET /auth/me": { body: makeSession() } });
    renderApp("/login");
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
  });

  it("does not open home before a temporary password is changed", async () => {
    const session = makeSession();
    session.user.mustChangePassword = true;
    mockFetch({ "GET /auth/me": { body: session } });
    renderApp("/");
    expect(await screen.findByText("Set your own password")).toBeInTheDocument();
  });

  it("still shows the login page when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderApp("/login");
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("offers Try again on a protected page when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderApp("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("No connection to the server");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("logs out and returns to the login page", async () => {
    const { calls } = mockFetch({
      "GET /auth/me": { body: makeSession() },
      "POST /auth/logout": { status: 204 },
    });
    const { user } = renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/auth/logout")).toBe(true);
  });
});
