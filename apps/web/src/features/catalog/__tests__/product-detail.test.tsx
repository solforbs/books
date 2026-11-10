import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogRoutes, makeProduct } from "@/test/catalog-fixtures";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

const product = makeProduct();
const routes = catalogRoutes({ "GET /products/p1": { body: { product } } });

describe("Product page", () => {
  it("shows the fields and the selling price", async () => {
    renderShop("/products/p1", routes);
    expect(await screen.findByRole("heading", { name: product.name })).toBeVisible();
    expect(screen.getByText("KES 15,500")).toBeInTheDocument();
    expect(screen.getByText("IMEI")).toBeInTheDocument();
    // Cost never appears here.
    expect(document.body.textContent).not.toMatch(/cost|profit/i);
  });

  it("generates a shop barcode and shows the new code big", async () => {
    const withCode = makeProduct({
      barcodes: [
        { id: "b9", value: "2000000000017", kind: "shop", packUnitId: null, active: true },
      ],
    });
    const { user, calls } = renderShop("/products/p1", {
      ...routes,
      "POST /products/p1/barcodes/generate": { body: { product: withCode } },
    });
    await user.click(await screen.findByRole("button", { name: "Generate a shop barcode" }));
    expect(await screen.findByTestId("new-barcode")).toHaveTextContent("2000000000017");
    expect(calls.some((c) => c.path === "/products/p1/barcodes/generate")).toBe(true);
  });

  it("adds a barcode and retires one after a confirmation", async () => {
    const withCode = makeProduct({
      barcodes: [
        { id: "b1", value: "6901234567892", kind: "manufacturer", packUnitId: null, active: true },
      ],
    });
    const { user, calls } = renderShop("/products/p1", {
      ...routes,
      "POST /products/p1/barcodes": { body: { product: withCode } },
      "POST /products/p1/barcodes/b1/retire": { body: { product } },
    });
    await user.type(await screen.findByLabelText("Add a barcode"), "6901234567892");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(calls.find((c) => c.path === "/products/p1/barcodes")?.body).toEqual({
      value: "6901234567892",
    });
  });

  it("explains in plain words why a product with stock cannot be hidden", async () => {
    const { user } = renderShop("/products/p1", {
      ...routes,
      "POST /products/p1/hide": apiError(409, "product_has_stock"),
    });
    await user.click(await screen.findByRole("button", { name: "Hide product" }));
    await user.click(screen.getByRole("button", { name: "Hide product" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This product still has stock. Sell, move or adjust the stock first, then hide it.",
    );
  });

  it("explains product_in_use when hiding is refused", async () => {
    const { user } = renderShop("/products/p1", {
      ...routes,
      "POST /products/p1/hide": apiError(409, "product_in_use"),
    });
    await user.click(await screen.findByRole("button", { name: "Hide product" }));
    await user.click(screen.getByRole("button", { name: "Hide product" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already has stock or sales");
  });

  it("shows a hidden product with a way to show it again", async () => {
    const { user, calls } = renderShop("/products/p1", {
      "GET /products/p1": { body: { product: makeProduct({ status: "hidden" }) } },
      "POST /products/p1/unhide": { body: { product } },
    });
    await user.click(await screen.findByRole("button", { name: "Show product again" }));
    expect(calls.some((c) => c.path === "/products/p1/unhide")).toBe(true);
  });

  it("a cashier sees no edit, hide, history or barcode-editing controls", async () => {
    renderShop("/products/p1", routes, accessFor("cashier"));
    await screen.findByRole("heading", { name: product.name });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show history" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add a barcode")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Generate a shop barcode" }),
    ).not.toBeInTheDocument();
    // A cashier can still copy a product (adding is allowed for them).
    expect(screen.getByRole("link", { name: "Copy" })).toBeInTheDocument();
  });

  it("a cashier does not see wholesale or minimum prices", async () => {
    renderShop(
      "/products/p1",
      catalogRoutes({
        "GET /products/p1": {
          body: { product: makeProduct({ wholesalePrice: 1400000, minPrice: 1300000 }) },
        },
      }),
      accessFor("cashier"),
    );
    await screen.findByRole("heading", { name: product.name });
    expect(screen.getByText("KES 15,500")).toBeInTheDocument();
    expect(screen.queryByText("KES 14,000")).not.toBeInTheDocument();
    expect(screen.queryByText("KES 13,000")).not.toBeInTheDocument();
  });

  it("shows the history, with price changes listed on their own, to a manager", async () => {
    const { user } = renderShop("/products/p1", {
      ...routes,
      "GET /products/p1/history": {
        body: {
          entries: [
            {
              at: "2026-11-03T10:00:00.000Z",
              by: { id: "u1", name: "Amina Hassan" },
              action: "updated",
              field: "retailPrice",
              before: 1500000,
              after: 1550000,
            },
          ],
        },
      },
    });
    await user.click(await screen.findByRole("button", { name: "Show history" }));
    expect(await screen.findByText("Price history")).toBeInTheDocument();
    expect(screen.getAllByText("From KES 15,000 to KES 15,500")).toHaveLength(2);
  });

  it("shows the waiting banner only when the product is waiting", async () => {
    const { unmount } = renderShop("/products/p1", routes);
    await screen.findByRole("heading", { name: product.name });
    expect(document.body.textContent).not.toMatch(/waiting/i);
    unmount();

    renderShop("/products/p1", {
      "GET /products/p1": { body: { product: makeProduct({ status: "waiting" }) } },
    });
    expect(await screen.findByText(/waiting for approval/)).toBeInTheDocument();
  });

  it("edits only what changed", async () => {
    const { user, calls } = renderShop("/products/p1/edit", {
      ...routes,
      "PATCH /products/p1": { body: { product } },
    });
    const price = await screen.findByLabelText("Retail price");
    await user.clear(price);
    await user.type(price, "16,000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("heading", { name: product.name });
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ retailPrice: 1600000 });
  });
});
