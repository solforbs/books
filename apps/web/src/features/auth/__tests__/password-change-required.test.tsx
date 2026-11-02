import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STRONG_PASSWORD } from "@/test/fixtures";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { makeLocation } from "@/test/shop-fixtures";

const REQUIRED = apiError(403, "password_change_required");
const shop1 = makeLocation({ id: "l1", name: "Shop 1" });

describe("server-enforced password change", () => {
  it("sends the person to Set your own password when a page load is refused", async () => {
    const { calls } = renderShop("/settings/staff", { "GET /staff": REQUIRED });
    expect(await screen.findByText("Set your own password")).toBeInTheDocument();
    // No loop: the refused call is not repeated, and no refresh is attempted for a 403.
    await waitFor(() => expect(calls.filter((c) => c.path === "/staff")).toHaveLength(1));
    expect(calls.some((c) => c.path === "/auth/refresh")).toBe(false);
  });

  it("does the same when a save is refused", async () => {
    const { user } = renderShop("/settings/staff/new", {
      "GET /locations": { body: { locations: [shop1] } },
      "POST /staff": REQUIRED,
    });
    await user.type(await screen.findByLabelText("Name"), "Juma Otieno");
    await user.type(screen.getByLabelText("Phone number"), "0722 000 111");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Set your own password")).toBeInTheDocument();
  });

  it("still lets the person log out", async () => {
    const { user, calls } = renderShop("/settings/staff", {
      "GET /staff": REQUIRED,
      "POST /auth/logout": { status: 204 },
    });
    await screen.findByText("Set your own password");
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/auth/logout")).toBe(true);
  });

  it("opens the app again once the new password is saved", async () => {
    const { user } = renderShop("/settings/staff", {
      "GET /staff": REQUIRED,
      "POST /auth/change-password": { status: 204 },
    });
    await screen.findByText("Set your own password");
    await user.type(screen.getByLabelText("Temporary or current password"), "Tmp-Kiosk-4821");
    await user.type(screen.getByLabelText("New password"), STRONG_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
  });
});
