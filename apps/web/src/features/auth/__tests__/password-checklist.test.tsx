import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError, mockFetch } from "@/test/mock-fetch";
import { renderApp } from "@/test/render-app";

const LOGGED_OUT = {
  "GET /auth/me": apiError(401, "not_authenticated"),
  "POST /auth/refresh": apiError(401, "not_authenticated"),
};

function ruleState(rule: string) {
  const list = screen.getByTestId("password-checklist");
  return list.querySelector(`[data-rule="${rule}"]`)?.getAttribute("data-met");
}

describe("password checklist (register)", () => {
  it("ticks each rule live as the password improves", async () => {
    mockFetch(LOGGED_OUT);
    const { user } = renderApp("/register");
    const password = await screen.findByLabelText("Password");

    expect(ruleState("too_short")).toBe("false");
    expect(ruleState("too_simple")).toBe("false");

    await user.type(password, "abcdefghij");
    expect(ruleState("too_short")).toBe("true");
    expect(ruleState("too_simple")).toBe("false");

    await user.clear(password);
    await user.type(password, "Duka-Mpya-2026");
    expect(ruleState("too_short")).toBe("true");
    expect(ruleState("too_simple")).toBe("true");
    expect(ruleState("too_common")).toBe("true");
  });

  it("flags a password that contains the owner's name", async () => {
    mockFetch(LOGGED_OUT);
    const { user } = renderApp("/register");
    await user.type(await screen.findByLabelText("Your name"), "Amina");
    await user.type(screen.getByLabelText("Password"), "Amina-2026-x");
    expect(ruleState("too_common")).toBe("false");
  });

  it("explains the exact problem when a weak password is submitted", async () => {
    mockFetch(LOGGED_OUT);
    const { user } = renderApp("/register");
    await user.type(await screen.findByLabelText("Business name"), "Luthuli Phones");
    await user.type(screen.getByLabelText("Your name"), "Amina Hassan");
    await user.type(screen.getByLabelText("Phone number"), "0712345678");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const field = screen.getByLabelText("Password").closest("div")?.parentElement;
    expect(within(field as HTMLElement).getByText(/too short/i)).toBeInTheDocument();
  });

  it("shows and hides the password", async () => {
    mockFetch(LOGGED_OUT);
    const { user } = renderApp("/register");
    const password = await screen.findByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
