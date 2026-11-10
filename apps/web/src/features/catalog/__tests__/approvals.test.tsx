import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogRoutes, makeProduct, productsPage } from "@/test/catalog-fixtures";
import { apiError } from "@/test/mock-fetch";
import { renderShop, shellReady } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

const waitingProduct = makeProduct({
  id: "w1",
  name: "Oraimo charger 20W",
  status: "waiting",
  categoryId: "c-chargers",
  addedBy: { id: "u2", name: "Juma Otieno" },
  retailPrice: null,
  trackingType: "quantity",
});
const existing = makeProduct({
  id: "p5",
  name: "Oraimo 20W Charger",
  categoryId: "c-chargers",
  trackingType: "quantity",
});

const routes = catalogRoutes({
  "GET /products/waiting": productsPage([waitingProduct]),
  "GET /products": productsPage([existing]),
});

describe("Approvals (G1)", () => {
  it("an approver sees a count in the menu and the waiting list", async () => {
    const { user } = renderShop("/", routes);
    await shellReady();
    const badge = await screen.findAllByLabelText("1 product waiting for approval");
    expect(badge.length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("link", { name: /Products/ })[0] as HTMLElement);
    await user.click(await screen.findByRole("link", { name: /1 product is waiting/ }));
    expect(await screen.findByRole("heading", { name: "Waiting for approval" })).toBeVisible();
    expect(screen.getByText("Oraimo charger 20W")).toBeInTheDocument();
    expect(screen.getByText(/Added by Juma Otieno/)).toBeInTheDocument();
  });

  it("does not ask for the waiting list, or show any waiting wording, to non-approvers", async () => {
    const { calls } = renderShop("/products/waiting", routes, accessFor("cashier"));
    await screen.findByRole("heading", { name: "Products" });
    expect(calls.some((c) => c.path === "/products/waiting")).toBe(false);
    expect(document.body.textContent).not.toMatch(/approv|waiting/i);
  });

  it("an approver with nothing waiting never sees approval wording", async () => {
    const { calls } = renderShop(
      "/products/waiting",
      catalogRoutes({
        "GET /products/waiting": productsPage([]),
        "GET /products": productsPage([existing]),
      }),
    );
    await screen.findByRole("heading", { name: "Products" });
    expect(calls.some((c) => c.path === "/products/waiting")).toBe(true);
    expect(document.body.textContent).not.toMatch(/approv|waiting/i);
  });

  it("approves as it is, with an empty request", async () => {
    const { user, calls } = renderShop("/products/waiting", {
      ...routes,
      "POST /products/w1/approve": { body: { product: { ...waitingProduct, status: "active" } } },
    });
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/products/w1/approve")).toBe(true));
    expect(calls.find((c) => c.path === "/products/w1/approve")?.body).toEqual({});
  });

  it("lets the approver fix the name and price before approving", async () => {
    const { user, calls } = renderShop("/products/waiting", {
      ...routes,
      "POST /products/w1/approve": { body: { product: waitingProduct } },
    });
    await user.click(await screen.findByRole("button", { name: "Fix before approving" }));
    const name = screen.getByLabelText("Product name");
    await user.clear(name);
    await user.type(name, "Oraimo 20W Charger Fast");
    await user.type(screen.getByLabelText("Retail price"), "1,500");
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/products/w1/approve")).toBe(true));
    expect(calls.find((c) => c.path === "/products/w1/approve")?.body).toEqual({
      name: "Oraimo 20W Charger Fast",
      retailPrice: 150000,
    });
  });

  it("merge asks for a confirmation that says what moves and that it cannot be undone", async () => {
    const { user, calls } = renderShop("/products/waiting", {
      ...routes,
      "POST /products/w1/merge": { body: { product: existing } },
    });
    await user.click(await screen.findByRole("button", { name: "Same as an existing product" }));
    await user.type(screen.getByLabelText("Find the product it is the same as"), "oraimo");
    await user.click(await screen.findByRole("button", { name: "Oraimo 20W Charger" }));

    const message = screen.getByText(/Merge "Oraimo charger 20W" into "Oraimo 20W Charger"\?/);
    expect(message).toHaveTextContent("barcodes, stock, IMEIs and sales");
    expect(message).toHaveTextContent("This cannot be undone.");
    expect(calls.some((c) => c.path === "/products/w1/merge")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/products/w1/merge")).toBe(true));
    expect(calls.find((c) => c.path === "/products/w1/merge")?.body).toEqual({
      intoProductId: "p5",
    });
  });

  it("explains when a product cannot be rejected because it is in use", async () => {
    const { user } = renderShop("/products/waiting", {
      ...routes,
      "POST /products/w1/reject": apiError(409, "product_in_use"),
    });
    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.click(screen.getAllByRole("button", { name: "Reject" })[0] as HTMLElement);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      'cannot be rejected. Use "Same as an existing product" instead.',
    );
  });
});
