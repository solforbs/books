import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { accessFor, makeLocation, makeMember } from "@/test/shop-fixtures";

const shop1 = makeLocation({ id: "l1", name: "Shop 1" });
const owner = makeMember();
const cashier = makeMember({
  membershipId: "m2",
  userId: "u2",
  name: "Juma Otieno",
  role: "cashier",
  locationIds: ["l1"],
  permissions: { give_discounts: false },
});

const routes = {
  "GET /locations": { body: { locations: [shop1] } },
  "GET /staff": { body: { members: [owner, cashier] } },
  "POST /staff/m2/switch-off": {
    body: { member: { ...cashier, status: "switched_off" } },
  },
  "POST /staff/m2/reset-password": { body: { temporaryPassword: "New-Temp-9931" } },
  "PATCH /staff/m2": { body: { member: cashier } },
};

const OTHER_BUSINESS = {
  status: 403,
  body: {
    error: {
      code: "forbidden",
      message: "forbidden",
      details: { reason: "member_of_other_business" },
    },
  },
};

describe("Settings -> Staff -> person", () => {
  it("owner: switches start from the role defaults plus this person's changes", async () => {
    const { user, calls } = renderShop("/settings/staff/m2", routes);
    await user.click(await screen.findByRole("button", { name: /More: what this person can do/ }));
    expect(screen.getByRole("switch", { name: /Sell and take payments/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Give discounts/ })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /See costs and profit/ })).not.toBeChecked();

    await user.click(screen.getByRole("switch", { name: /See costs and profit/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.body).toEqual({
      permissions: { give_discounts: false, see_cost_profit: true },
    });
  });

  it("owner: switching off needs a confirmation", async () => {
    const { user, calls } = renderShop("/settings/staff/m2", routes);
    await user.click(await screen.findByRole("button", { name: "Switch off" }));
    expect(screen.getByText(/Switch off Juma Otieno\?/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith("/switch-off"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Switch off" }));
    expect(calls.some((c) => c.path === "/staff/m2/switch-off")).toBe(true);
  });

  it("owner: a password reset shows the new temporary password once", async () => {
    const { user } = renderShop("/settings/staff/m2", routes);
    await user.click(await screen.findByRole("button", { name: "Reset password" }));
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByTestId("temporary-password")).toHaveTextContent("New-Temp-9931");
  });

  it("shows a friendly message for last_owner", async () => {
    const { user } = renderShop("/settings/staff/m2", {
      ...routes,
      "POST /staff/m2/switch-off": apiError(409, "last_owner"),
    });
    await user.click(await screen.findByRole("button", { name: "Switch off" }));
    await user.click(screen.getByRole("button", { name: "Switch off" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "There must always be at least one owner",
    );
  });

  it("explains a refused change for someone who also works in another business", async () => {
    const { user } = renderShop("/settings/staff/m2", {
      ...routes,
      "PATCH /staff/m2": OTHER_BUSINESS,
    });
    await user.selectOptions(await screen.findByLabelText("Role"), "storekeeper");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This person also works in another business on Books, so you cannot change this for them.",
    );
  });

  it("uses the same message when a password reset is refused for that reason", async () => {
    const { user } = renderShop("/settings/staff/m2", {
      ...routes,
      "POST /staff/m2/reset-password": OTHER_BUSINESS,
    });
    await user.click(await screen.findByRole("button", { name: "Reset password" }));
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This person also works in another business on Books",
    );
    expect(screen.queryByTestId("temporary-password")).not.toBeInTheDocument();
  });

  it("owner: the reset panel says how long the temporary password works", async () => {
    const { user } = renderShop("/settings/staff/m2", routes);
    await user.click(await screen.findByRole("button", { name: "Reset password" }));
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(
      await screen.findByText("This temporary password works for 72 hours."),
    ).toBeInTheDocument();
  });

  it("owner looking at themselves: no role, switch-off or reset controls", async () => {
    renderShop("/settings/staff/m1", routes);
    expect(await screen.findByText(/This is you/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch off" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
  });

  it("manager with add staff: only reset password, no owner-only actions", async () => {
    const access = accessFor("manager", ["l1"]);
    access.permissions.push("add_staff");
    renderShop("/settings/staff/m2", routes, access);
    expect(await screen.findByRole("button", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch off" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
    expect(screen.queryByText(/More: what this person can do/)).not.toBeInTheDocument();
    expect(screen.queryByText("Login history")).not.toBeInTheDocument();
  });

  it("member_not_found when the person is not in the list", async () => {
    renderShop("/settings/staff/unknown", routes);
    expect(await screen.findByRole("alert")).toHaveTextContent("This staff member was not found.");
  });
});
