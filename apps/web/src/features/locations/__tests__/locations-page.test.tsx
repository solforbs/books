import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { makeLocation } from "@/test/shop-fixtures";

const shop1 = makeLocation({ id: "l1", name: "Shop 1" });
const shop2 = makeLocation({ id: "l2", name: "Shop 2" });
const oldShop = makeLocation({ id: "l3", name: "Old Shop", status: "closed" });

function notEmpty() {
  return {
    status: 409,
    body: {
      error: {
        code: "location_not_empty",
        message: "not empty",
        details: { stockQuantity: 23, cashDrawerCents: 450000 },
      },
    },
  };
}

describe("Settings -> Locations", () => {
  it("adds a shop with the defaults: sells, retail prices", async () => {
    const { user, calls } = renderShop("/settings/locations", {
      "POST /locations": { status: 201, body: { location: shop2 } },
    });
    await user.click(await screen.findByRole("button", { name: "Add location" }));
    await user.type(screen.getByLabelText("Name"), "Shop 2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const post = calls.find((c) => c.method === "POST" && c.path === "/locations");
    expect(post?.body).toEqual({
      name: "Shop 2",
      type: "shop",
      canSell: true,
      priceList: "retail",
    });
  });

  it("adds a store that does not sell, with selling behind More", async () => {
    const { user, calls } = renderShop("/settings/locations", {
      "POST /locations": { status: 201, body: { location: shop2 } },
    });
    await user.click(await screen.findByRole("button", { name: "Add location" }));
    expect(screen.queryByRole("switch", { name: /Sells here/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Main Store");
    await user.click(screen.getByRole("radio", { name: "Store" }));
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("switch", { name: /Sells here/ })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save" }));

    const post = calls.find((c) => c.method === "POST" && c.path === "/locations");
    expect(post?.body).toEqual({
      name: "Main Store",
      type: "store",
      canSell: false,
      priceList: "retail",
    });
  });

  it("shows open locations first and closed ones under Show closed, with Open again", async () => {
    const { user, calls } = renderShop("/settings/locations", {
      "GET /locations": { body: { locations: [oldShop, shop1] } },
      "POST /locations/l3/reopen": { body: { location: { ...oldShop, status: "open" } } },
    });
    const open = await screen.findByRole("list", { name: "Open locations" });
    expect(within(open).getByText("Shop 1")).toBeInTheDocument();
    expect(screen.queryByText("Old Shop")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show closed (1)" }));
    const closedList = screen.getByRole("list", { name: "Closed locations" });
    await user.click(within(closedList).getByRole("button", { name: "Open again" }));
    expect(calls.some((c) => c.path === "/locations/l3/reopen")).toBe(true);
  });

  it("explains what to move when a location still has stock or cash", async () => {
    const { user } = renderShop("/settings/locations", {
      "GET /locations": { body: { locations: [shop1, shop2] } },
      "POST /locations/l2/close": notEmpty(),
    });
    const list = await screen.findByRole("list", { name: "Open locations" });
    const row = within(list).getByText("Shop 2").closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Close" }));
    expect(within(row).getByText(/Close Shop 2\?/)).toBeInTheDocument();
    await user.click(within(row).getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement);

    const alert = await within(row).findByRole("alert");
    expect(alert).toHaveTextContent("This location cannot be closed yet");
    expect(alert).toHaveTextContent("items: 23");
    expect(alert).toHaveTextContent("KES 4,500.00");
  });

  it("explains that the last open location cannot be closed", async () => {
    const { user } = renderShop("/settings/locations", {
      "POST /locations/l1/close": apiError(409, "last_location"),
    });
    const row = (await screen.findByText("Luthuli Shop 1")).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Close" }));
    await user.click(within(row).getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement);
    expect(await within(row).findByRole("alert")).toHaveTextContent(
      "This is your only open location",
    );
  });
});
