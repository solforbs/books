import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { business, catalogRoutes, makeProduct, productsPage } from "@/test/catalog-fixtures";
import { renderShop } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

/** Owner switch "Hide selling prices from storekeepers" (F01 section 11). */
const priced = makeProduct({ id: "p1", retailPrice: 1550000, wholesalePrice: 1400000 });
const withFlag = (hide: boolean) => ({
  ...catalogRoutes(),
  "GET /business": { body: { business: { ...business, hidePricesFromStorekeepers: hide } } },
  "GET /products": productsPage([priced]),
  "GET /products/p1": { body: { product: priced } },
});

describe("hiding selling prices from storekeepers", () => {
  it("the list shows no price to a storekeeper when the switch is on", async () => {
    renderShop("/products", withFlag(true), accessFor("storekeeper"));
    expect(await screen.findByText(priced.name)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/KES/);
  });

  it("the list shows the price to a storekeeper when the switch is off", async () => {
    renderShop("/products", withFlag(false), accessFor("storekeeper"));
    expect(await screen.findByText("KES 15,500")).toBeInTheDocument();
  });

  it("a manager always sees the price", async () => {
    renderShop("/products", withFlag(true), accessFor("manager"));
    expect(await screen.findByText("KES 15,500")).toBeInTheDocument();
  });

  it("the product page shows no price rows to a storekeeper when the switch is on", async () => {
    renderShop("/products/p1", withFlag(true), accessFor("storekeeper"));
    expect(await screen.findByRole("heading", { name: priced.name })).toBeVisible();
    expect(screen.queryByText("Retail price")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/KES|Wholesale|Lowest price/);
  });

  it("the product page shows the price row with the switch off", async () => {
    renderShop("/products/p1", withFlag(false), accessFor("storekeeper"));
    expect(await screen.findByText("Retail price")).toBeInTheDocument();
    expect(screen.getByText("KES 15,500")).toBeInTheDocument();
  });

  it("the add form has no price fields for the storekeeper, switch on or off", async () => {
    for (const hide of [true, false]) {
      const { unmount } = renderShop("/products/new", withFlag(hide), accessFor("storekeeper"));
      await screen.findByRole("heading", { level: 1 });
      expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("Settings -> Business details has the switch, off by default, and saves it", async () => {
    const { user, calls } = renderShop("/settings/business", {
      "GET /business": { body: { business } },
      "PUT /business": {
        body: { business: { ...business, hidePricesFromStorekeepers: true } },
      },
    });
    const toggle = await screen.findByRole("switch", {
      name: /Hide selling prices from storekeepers/,
    });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved");
    expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({
      hidePricesFromStorekeepers: true,
    });
  });
});
