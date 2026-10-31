import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeSession, RECOVERY_CODES, STRONG_PASSWORD } from "@/test/fixtures";
import { apiError, mockFetch } from "@/test/mock-fetch";
import { renderApp } from "@/test/render-app";

const LOGGED_OUT = {
  "GET /auth/me": apiError(401, "not_authenticated"),
  "POST /auth/refresh": apiError(401, "not_authenticated"),
};

async function fillForm(user: ReturnType<typeof renderApp>["user"]) {
  await user.type(await screen.findByLabelText("Business name"), "Luthuli Phones");
  await user.type(screen.getByLabelText("Your name"), "Amina Hassan");
  await user.type(screen.getByLabelText("Phone number"), "0712 345 678");
  await user.type(screen.getByLabelText("Email"), "Amina@Example.com");
  await user.type(screen.getByLabelText("Password"), STRONG_PASSWORD);
}

describe("register business", () => {
  it("submits the contract payload, then requires saving the recovery codes", async () => {
    const { calls } = mockFetch({
      ...LOGGED_OUT,
      "POST /auth/register": {
        status: 201,
        body: { ...makeSession(), recoveryCodes: RECOVERY_CODES },
      },
    });
    const { user } = renderApp("/register");
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Save your recovery codes")).toBeInTheDocument();
    const register = calls.find((c) => c.path === "/auth/register");
    expect(register?.body).toEqual({
      businessName: "Luthuli Phones",
      ownerName: "Amina Hassan",
      phone: "+254712345678",
      email: "amina@example.com",
      password: STRONG_PASSWORD,
      language: "en",
    });

    for (const code of RECOVERY_CODES) expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy codes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download (.txt)" })).toBeInTheDocument();

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    await user.click(screen.getByLabelText("I have saved them"));
    await user.click(continueButton);

    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
    expect(screen.getByText("Business: Luthuli Phones")).toBeInTheDocument();
  });

  it("asks for a phone number or an email before calling the API", async () => {
    const { calls } = mockFetch(LOGGED_OUT);
    const { user } = renderApp("/register");
    await user.type(await screen.findByLabelText("Business name"), "Luthuli Phones");
    await user.type(screen.getByLabelText("Your name"), "Amina Hassan");
    await user.type(screen.getByLabelText("Password"), STRONG_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Enter a phone number or an email.")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/auth/register")).toBe(false);
  });

  it("shows a friendly message when the phone or email is already used", async () => {
    mockFetch({ ...LOGGED_OUT, "POST /auth/register": apiError(409, "identifier_taken") });
    const { user } = renderApp("/register");
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This phone number or email is already used. Log in instead.",
    );
  });
});
