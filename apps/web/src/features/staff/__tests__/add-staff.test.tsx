import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { accessFor, makeLocation, makeMember } from "@/test/shop-fixtures";

const shop1 = makeLocation({ id: "l1", name: "Shop 1" });
const shop2 = makeLocation({ id: "l2", name: "Shop 2" });
const owner = makeMember();
const juma = makeMember({
  membershipId: "m2",
  userId: "u2",
  name: "Juma Otieno",
  phone: "+254722000111",
  role: "cashier",
  locationIds: ["l1"],
  mustChangePassword: true,
});
const TEMP = "Tmp-Kiosk-4821";

function routes(temporaryPassword: string | null) {
  return {
    "GET /locations": { body: { locations: [shop1, shop2] } },
    "GET /staff": { body: { members: [owner] } },
    "POST /staff": { status: 201, body: { member: juma, temporaryPassword } },
  };
}

async function fillAndSave(user: ReturnType<typeof renderShop>["user"]) {
  await user.type(await screen.findByLabelText("Name"), "Juma Otieno");
  await user.type(screen.getByLabelText("Phone number"), "0722 000 111");
  await user.click(screen.getByRole("checkbox", { name: "Shop 1" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
}

describe("Settings -> Staff -> Add", () => {
  it("shows the temporary password once and forgets it after leaving", async () => {
    const { user, calls, client } = renderShop("/settings/staff/new", routes(TEMP));
    await fillAndSave(user);

    expect(await screen.findByTestId("temporary-password")).toHaveTextContent(TEMP);
    expect(screen.getByText(/must choose their own password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy password" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.path === "/staff");
    expect(post?.body).toMatchObject({
      name: "Juma Otieno",
      phone: "+254722000111",
      role: "cashier",
      locationIds: ["l1"],
    });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("heading", { name: "Staff" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Add staff" }));
    expect(await screen.findByLabelText("Name")).toHaveValue("");
    expect(screen.queryByText(TEMP)).not.toBeInTheDocument();
    // Not kept in any cache either.
    const cached = JSON.stringify([
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      client
        .getMutationCache()
        .getAll()
        .map((m) => m.state.data),
    ]);
    expect(cached).not.toContain(TEMP);
  });

  it("tells the owner that an existing user keeps their own password", async () => {
    const { user } = renderShop("/settings/staff/new", routes(null));
    await fillAndSave(user);
    expect(await screen.findByText(/Juma Otieno already has a Books account/)).toBeInTheDocument();
    expect(screen.queryByTestId("temporary-password")).not.toBeInTheDocument();
  });

  it("needs a location for staff who are not owners", async () => {
    const { user, calls } = renderShop("/settings/staff/new", routes(TEMP));
    await user.type(await screen.findByLabelText("Name"), "Juma Otieno");
    await user.type(screen.getByLabelText("Phone number"), "0722 000 111");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose at least one location.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("explains when the person already works here", async () => {
    const { user } = renderShop("/settings/staff/new", {
      ...routes(TEMP),
      "POST /staff": apiError(409, "already_member"),
    });
    await fillAndSave(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This person already works in your business.",
    );
  });

  it("lets a manager add only cashiers and storekeepers at their own locations", async () => {
    const access = accessFor("manager", ["l2"]);
    access.permissions.push("add_staff");
    renderShop("/settings/staff/new", routes(TEMP), access);
    const roles = within(await screen.findByLabelText("Role"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(roles).toEqual(["Cashier", "Storekeeper"]);
    expect(screen.queryByRole("checkbox", { name: "Shop 1" })).not.toBeInTheDocument();
    // Their only location is ticked already.
    expect(screen.getByRole("checkbox", { name: "Shop 2" })).toBeChecked();
  });
});
