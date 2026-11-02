import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeSession } from "@/test/fixtures";
import { apiError, mockFetch } from "@/test/mock-fetch";
import { renderApp } from "@/test/render-app";

const LOGGED_OUT = {
  "GET /auth/me": apiError(401, "not_authenticated"),
  "POST /auth/refresh": apiError(401, "not_authenticated"),
};

const TWO_BUSINESSES = makeSession({
  activeTenantId: null,
  memberships: [
    { tenantId: "t1", businessName: "Luthuli Phones", role: "owner" },
    { tenantId: "t2", businessName: "Eastleigh Electronics", role: "cashier" },
  ],
});

async function logIn(user: ReturnType<typeof renderApp>["user"], identifier: string) {
  await user.type(await screen.findByLabelText("Phone number or email"), identifier);
  await user.type(screen.getByLabelText("Password"), "Duka-Mpya-2026");
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

describe("login", () => {
  it("tells a person switched off everywhere why, instead of an empty business list", async () => {
    mockFetch({
      ...LOGGED_OUT,
      "POST /auth/login": { body: makeSession({ activeTenantId: null, memberships: [] }) },
    });
    const { user } = renderApp("/login");
    await logIn(user, "0722 111 222");

    expect(await screen.findByText("No active business")).toBeInTheDocument();
    expect(screen.getByText(/Ask the shop owner to switch you back on/)).toBeInTheDocument();
    expect(screen.queryByText("Choose business")).not.toBeInTheDocument();
  });

  it("lets a person in several businesses choose one, then opens it", async () => {
    const { calls } = mockFetch({
      ...LOGGED_OUT,
      "POST /auth/login": { body: TWO_BUSINESSES },
      "POST /auth/select-business": {
        body: { ...TWO_BUSINESSES, activeTenantId: "t2" },
      },
    });
    const { user } = renderApp("/login");
    await logIn(user, "0712 345 678");

    expect(await screen.findByText("Choose business")).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/auth/login")?.body).toEqual({
      identifier: "+254712345678",
      password: "Duka-Mpya-2026",
    });
    expect(screen.getByText("Luthuli Phones")).toBeInTheDocument();
    expect(screen.getByText("Cashier")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Eastleigh Electronics/ }));

    expect(await screen.findByText("Business: Eastleigh Electronics")).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/auth/select-business")?.body).toEqual({
      tenantId: "t2",
    });
  });

  it("goes straight home with one business", async () => {
    mockFetch({ ...LOGGED_OUT, "POST /auth/login": { body: makeSession() } });
    const { user } = renderApp("/login");
    await logIn(user, "amina@example.com");
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
  });

  it("forces a new password when the account has a temporary one", async () => {
    const temp = makeSession();
    temp.user.mustChangePassword = true;
    mockFetch({ ...LOGGED_OUT, "POST /auth/login": { body: temp } });
    const { user } = renderApp("/login");
    await logIn(user, "amina@example.com");
    expect(await screen.findByText("Set your own password")).toBeInTheDocument();
  });

  it("shows a friendly message for a wrong password", async () => {
    mockFetch({ ...LOGGED_OUT, "POST /auth/login": apiError(401, "invalid_credentials") });
    const { user } = renderApp("/login");
    await logIn(user, "0712345678");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wrong phone number, email or password.",
    );
  });

  it("switches the screen to Somali", async () => {
    mockFetch(LOGGED_OUT);
    const { user } = renderApp("/login");
    await user.selectOptions(await screen.findByLabelText("Language"), "so");
    expect(await screen.findByLabelText("Lambarka taleefanka ama iimaylka")).toBeInTheDocument();
    expect(window.localStorage.getItem("books.language")).toBe("so");
  });
});
