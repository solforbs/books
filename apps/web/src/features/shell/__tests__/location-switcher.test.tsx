import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { locationStorageKey } from "@/features/locations/hooks/current-location";
import { renderShop } from "@/test/render-shop";
import { accessFor, makeLocation } from "@/test/shop-fixtures";

const shop1 = makeLocation({ id: "l1", name: "Shop 1" });
const store = makeLocation({ id: "l2", name: "Main Store", type: "store", canSell: false });
const shop2 = makeLocation({ id: "l3", name: "Shop 2" });
const closed = makeLocation({ id: "l4", name: "Old Shop", status: "closed" });

describe("location switcher", () => {
  it("is hidden when there is only one location", async () => {
    renderShop("/");
    expect(await screen.findByText("Location: Luthuli Shop 1")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Location" })).not.toBeInTheDocument();
  });

  it("lists only the open locations this person works at, and remembers the choice", async () => {
    const routes = { "GET /locations": { body: { locations: [shop1, store, shop2, closed] } } };
    const { user } = renderShop("/", routes, accessFor("manager", ["l1", "l2"]));

    const picker = await screen.findByRole("combobox", { name: "Location" });
    const names = within(picker)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(names).toEqual(["Shop 1", "Main Store"]);
    expect(screen.getByText("Location: Shop 1")).toBeInTheDocument();

    await user.selectOptions(picker, "l2");
    expect(screen.getByText("Location: Main Store")).toBeInTheDocument();
    expect(window.localStorage.getItem(locationStorageKey("t1"))).toBe("l2");
  });

  it("starts at the location remembered on this device", async () => {
    window.localStorage.setItem(locationStorageKey("t1"), "l3");
    renderShop("/", { "GET /locations": { body: { locations: [shop1, shop2] } } });
    expect(await screen.findByText("Location: Shop 2")).toBeInTheDocument();
  });

  it("falls back to the first location when the remembered one is not allowed", async () => {
    window.localStorage.setItem(locationStorageKey("t1"), "l3");
    const routes = { "GET /locations": { body: { locations: [shop1, store, shop2] } } };
    renderShop("/", routes, accessFor("manager", ["l1", "l2"]));
    expect(await screen.findByText("Location: Shop 1")).toBeInTheDocument();
  });
});
