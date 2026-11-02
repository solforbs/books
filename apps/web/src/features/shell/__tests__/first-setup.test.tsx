import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { accessFor, makeLocation } from "@/test/shop-fixtures";

describe("first-time setup (F02 §2.1 step 4)", () => {
  it("an owner names the first shop, which creates it and opens home", async () => {
    const shop = makeLocation({ name: "Luthuli Shop 1" });
    const { user, calls } = renderShop("/", {
      "GET /locations": [{ body: { locations: [] } }, { body: { locations: [shop] } }],
      "POST /locations": { status: 201, body: { location: shop } },
    });

    expect(await screen.findByRole("heading", { name: "Where do you sell?" })).toBeVisible();
    // Nothing else to do before the first shop exists: no menu yet.
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Shop name"), "Luthuli Shop 1");
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.path === "/locations");
    expect(post?.body).toEqual({ name: "Luthuli Shop 1", type: "shop", priceList: "retail" });
  });

  it("asks for a name before calling the API", async () => {
    const { user, calls } = renderShop("/", { "GET /locations": { body: { locations: [] } } });
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("Enter at least 2 letters.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("shows the API error when the shop cannot be created", async () => {
    const { user } = renderShop("/", {
      "GET /locations": { body: { locations: [] } },
      "POST /locations": apiError(403, "forbidden"),
    });
    await user.type(await screen.findByLabelText("Shop name"), "Shop 1");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You are not allowed");
  });

  it("someone who is not an owner is asked to wait for the owner", async () => {
    renderShop("/", { "GET /locations": { body: { locations: [] } } }, accessFor("cashier", []));
    expect(await screen.findByText("No location yet")).toBeInTheDocument();
    expect(screen.getByText(/Ask the owner to add a location/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Shop name")).not.toBeInTheDocument();
  });
});
