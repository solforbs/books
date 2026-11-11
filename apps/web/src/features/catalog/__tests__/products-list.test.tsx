import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogRoutes, makeProduct, productsPage } from "@/test/catalog-fixtures";
import { renderShop, shellReady } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

describe("Products list", () => {
  it("shows an empty state with a clear call to add the first product", async () => {
    renderShop("/products", catalogRoutes({ "GET /products": productsPage([]) }));
    expect(await screen.findByText("You have no products yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first product" })).toHaveAttribute(
      "href",
      "/products/new",
    );
  });

  it("lists products with the price, and loads more with the cursor", async () => {
    const first = makeProduct({ id: "p1", name: "Samsung A15" });
    const second = makeProduct({ id: "p2", name: "Tecno Spark 20", retailPrice: 1200000 });
    const { user, calls } = renderShop(
      "/products",
      catalogRoutes({
        "GET /products": [productsPage([first], "next-1"), productsPage([second], null)],
      }),
    );
    expect(await screen.findByText("Samsung A15")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Tecno Spark 20")).toBeInTheDocument();
    expect(screen.getByText("KES 12,000")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith("/products?")).at(-1)?.path).toContain(
      "cursor=next-1",
    );
  });

  it("searches by typing and filters by category", async () => {
    const { user, calls } = renderShop(
      "/products",
      catalogRoutes({ "GET /products": productsPage([makeProduct()]) }),
    );
    await screen.findByText("Samsung A15 128GB Black New");
    await user.type(screen.getByLabelText("Search by name, model, brand or barcode"), "a15");
    await user.selectOptions(screen.getByLabelText("Filter by category"), "Phones");
    // Typing settles for a moment before the list asks the server again.
    await waitFor(() => {
      const last = calls.filter((c) => c.path.startsWith("/products?")).at(-1)?.path ?? "";
      expect(last).toContain("q=a15");
      expect(last).toContain("categoryId=c-phones");
    });
  });

  it("scan: one match opens the product", async () => {
    const { user } = renderShop(
      "/products",
      catalogRoutes({
        "GET /products": productsPage([makeProduct()]),
        "GET /products/lookup": productsPage([makeProduct({ id: "p1" })]),
        "GET /products/p1": { body: { product: makeProduct() } },
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Scan" }));
    await user.type(screen.getByLabelText("Scan or type a barcode"), "6901234567892{Enter}");
    expect(
      await screen.findByRole("heading", { name: "Samsung A15 128GB Black New" }),
    ).toBeVisible();
  });

  it("scan: no match offers to add a new product with the barcode filled in", async () => {
    const { user, calls } = renderShop(
      "/products",
      catalogRoutes({
        "GET /products": productsPage([makeProduct()]),
        "GET /products/lookup": productsPage([]),
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Scan" }));
    await user.type(screen.getByLabelText("Scan or type a barcode"), "6901234567892{Enter}");
    expect(
      await screen.findByText("No product has the barcode 6901234567892."),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/products/lookup?barcode=6901234567892")).toBe(true);
    await user.click(screen.getByRole("link", { name: "Add new product" }));
    const barcodeBox = await screen.findByLabelText("Category");
    expect(barcodeBox).toBeInTheDocument();
    await user.selectOptions(barcodeBox, "Phones");
    expect(await screen.findByText("6901234567892")).toBeInTheDocument();
  });

  it("scan: several matches (differing in condition) are listed to choose from", async () => {
    const { user } = renderShop(
      "/products",
      catalogRoutes({
        "GET /products": productsPage([makeProduct()]),
        "GET /products/lookup": productsPage([
          makeProduct({ id: "p1", name: "iPhone 13 Blue New" }),
          makeProduct({ id: "p2", name: "iPhone 13 Blue Ex-UK" }),
        ]),
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Scan" }));
    await user.type(screen.getByLabelText("Scan or type a barcode"), "6901234567892{Enter}");
    expect(await screen.findByRole("link", { name: "iPhone 13 Blue Ex-UK" })).toHaveAttribute(
      "href",
      "/products/p2",
    );
  });

  it("badges only where they matter and offers hidden products to managers only", async () => {
    const { unmount } = renderShop(
      "/products",
      catalogRoutes({
        "GET /products": productsPage([
          makeProduct({ id: "p1", name: "Samsung A15" }),
          makeProduct({ id: "p2", name: "Oraimo 20W charger", status: "waiting" }),
        ]),
      }),
    );
    await screen.findByText("Samsung A15");
    expect(screen.getAllByText("Waiting")).toHaveLength(1);
    expect(
      screen.getByLabelText("Show hidden products", { selector: "input" }),
    ).toBeInTheDocument();
    unmount();

    renderShop(
      "/products",
      catalogRoutes({ "GET /products": productsPage([makeProduct()]) }),
      accessFor("cashier"),
    );
    await screen.findByText("Samsung A15 128GB Black New");
    expect(screen.queryByLabelText("Show hidden products")).not.toBeInTheDocument();
  });

  it("every member sees Products in the main menu", async () => {
    renderShop("/", catalogRoutes(), accessFor("storekeeper"));
    await shellReady();
    expect((await screen.findAllByRole("link", { name: "Products" })).length).toBeGreaterThan(0);
  });
});
