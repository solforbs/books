import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderShop } from "@/test/render-shop";
import { makeLocation, makeMoneyPlace } from "@/test/shop-fixtures";

const shop1 = makeLocation({ id: "l1", name: "Shop 1" });
const shop2 = makeLocation({ id: "l2", name: "Shop 2", cashDrawerId: "d2" });
const drawer = makeMoneyPlace({ id: "d1", name: "Shop 1 cash", locationIds: ["l1"] });
const bank = makeMoneyPlace({
  id: "b1",
  type: "bank",
  name: "KCB Account",
  number: "1234567",
  locationIds: ["l1", "l2"],
});
const till = makeMoneyPlace({ id: "t1", type: "mpesa_till", name: "Shop till", number: "555" });

function routes(places = [drawer]) {
  return {
    "GET /locations": { body: { locations: [shop1, shop2] } },
    "GET /money-places": { body: { moneyPlaces: places } },
    "POST /money-places": { status: 201, body: { moneyPlace: till } },
  };
}

describe("Settings -> Money places", () => {
  it("shows cash drawers without actions and never offers them as a new type", async () => {
    const { user } = renderShop("/settings/money-places", routes());
    const row = (await screen.findByText("Shop 1 cash")).closest("li") as HTMLElement;
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add money place" }));
    const types = within(screen.getByLabelText("Type"))
      .getAllByRole("option")
      .map((o) => o.getAttribute("value"));
    expect(types).toEqual(["mpesa_till", "mpesa_paybill", "bank", "safe"]);
  });

  it("needs at least one location before saving", async () => {
    const { user, calls } = renderShop("/settings/money-places", routes());
    await user.click(await screen.findByRole("button", { name: "Add money place" }));
    await user.type(screen.getByLabelText("Name"), "Shop till");
    await user.type(screen.getByLabelText("Till number"), "555");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose at least one location.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    await user.click(screen.getByRole("checkbox", { name: "Shop 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Shop 2" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    const post = calls.find((c) => c.method === "POST" && c.path === "/money-places");
    expect(post?.body).toEqual({
      type: "mpesa_till",
      name: "Shop till",
      number: "555",
      locationIds: ["l1", "l2"],
    });
  });

  it("offers 'settles to bank' for a Paybill only when a bank exists", async () => {
    const { user, calls } = renderShop("/settings/money-places", routes([drawer, bank]));
    await user.click(await screen.findByRole("button", { name: "Add money place" }));
    expect(screen.queryByLabelText("Money from this Paybill goes to")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Type"), "mpesa_paybill");
    await user.type(screen.getByLabelText("Name"), "Paybill");
    await user.type(screen.getByLabelText("Paybill number"), "888");
    await user.selectOptions(screen.getByLabelText("Money from this Paybill goes to"), "b1");
    await user.click(screen.getByRole("checkbox", { name: "Shop 1" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    const post = calls.find((c) => c.method === "POST" && c.path === "/money-places");
    expect(post?.body).toMatchObject({ type: "mpesa_paybill", settlesToId: "b1" });
  });

  it("hides a money place", async () => {
    const { user, calls } = renderShop("/settings/money-places", {
      ...routes([drawer, till]),
      "PATCH /money-places/t1": { body: { moneyPlace: { ...till, hidden: true } } },
    });
    const row = (await screen.findByText("Shop till")).closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Hide" }));
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.body).toEqual({ hidden: true });
  });
});
