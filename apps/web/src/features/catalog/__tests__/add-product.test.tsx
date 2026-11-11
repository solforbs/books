import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NO_PROBLEMS, catalogRoutes, makeCategory, makeProduct } from "@/test/catalog-fixtures";
import { renderShop } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

const created = makeProduct();

async function fillPhone(user: UserEvent) {
  await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
  await user.type(screen.getByLabelText("Brand"), "Samsung");
  await user.type(screen.getByLabelText("Model"), "A15");
  await user.type(screen.getByLabelText("Storage"), "128GB");
  await user.type(screen.getByLabelText("Colour"), "Black");
  await user.type(screen.getByLabelText("Condition"), "New");
}

describe("Add a product", () => {
  it("adds a category inline without nesting a form inside the product form", async () => {
    const laptops = makeCategory({ id: "c-laptops", name: "Laptops", defaultTracking: "serial" });
    const { user, calls } = renderShop("/products/new", {
      ...catalogRoutes(),
      "POST /product-categories": { status: 201, body: { category: laptops } },
    });
    await user.click(await screen.findByRole("button", { name: "Add a category" }));
    // A form inside a form is invalid HTML: the browser then submits the page instead of saving.
    expect(document.querySelector("form form")).toBeNull();

    await user.type(screen.getByLabelText("Category name"), "Laptops");
    await user.click(screen.getByRole("radio", { name: "Serial number" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls.some((c) => c.path === "/product-categories" && c.method === "POST")).toBe(true),
    );
    expect(
      calls.find((c) => c.method === "POST" && c.path === "/product-categories")?.body,
    ).toMatchObject({
      name: "Laptops",
      defaultTracking: "serial",
    });
  });

  it("saves the inline category when Enter is pressed in its name field", async () => {
    const { user, calls } = renderShop("/products/new", {
      ...catalogRoutes(),
      "POST /product-categories": {
        status: 201,
        body: { category: makeCategory({ id: "c-x", name: "Cables" }) },
      },
    });
    await user.click(await screen.findByRole("button", { name: "Add a category" }));
    await user.type(screen.getByLabelText("Category name"), "Cables{Enter}");
    await waitFor(() =>
      expect(calls.some((c) => c.method === "POST" && c.path === "/product-categories")).toBe(true),
    );
  });

  it("shows a live name preview built from the parts", async () => {
    const { user } = renderShop("/products/new", catalogRoutes());
    await fillPhone(user);
    expect(screen.getByTestId("name-preview")).toHaveTextContent(
      "Samsung A15 128GB Black New, correct?",
    );
    await user.clear(screen.getByLabelText("Colour"));
    await user.type(screen.getByLabelText("Colour"), "Blue");
    expect(screen.getByTestId("name-preview")).toHaveTextContent("Samsung A15 128GB Blue New");
  });

  it("asks for parts in a parts category and for a typed name in a free one", async () => {
    const { user } = renderShop("/products/new", catalogRoutes());
    await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    expect(screen.getByLabelText("Brand")).toBeInTheDocument();
    expect(screen.queryByLabelText("Product name")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Category"), "Chargers");
    expect(screen.getByLabelText("Product name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Brand")).not.toBeInTheDocument();
    // The tracking choice follows the category until the person changes it.
    expect(screen.getByRole("radio", { name: "Quantity only" })).toBeChecked();
  });

  it("saves typed shillings as cents and opens the new product", async () => {
    const { user, calls } = renderShop("/products/new", {
      ...catalogRoutes({
        "POST /products/check": NO_PROBLEMS,
        "POST /products": { status: 201, body: { product: created } },
        "GET /products/p1": { body: { product: created } },
      }),
    });
    await fillPhone(user);
    await user.type(screen.getByLabelText("Retail price"), "15,500");
    await user.type(screen.getByLabelText(/Barcodes on the box/), "6901234567892{Enter}");
    await user.click(screen.getByRole("button", { name: "Save product" }));

    expect(
      await screen.findByRole("heading", { name: "Samsung A15 128GB Black New" }),
    ).toBeVisible();
    const post = calls.find((c) => c.method === "POST" && c.path === "/products");
    expect(post?.body).toMatchObject({
      categoryId: "c-phones",
      brand: "Samsung",
      model: "A15",
      retailPrice: 1550000,
      trackingType: "imei",
      barcodes: ["6901234567892"],
      acknowledgeSimilar: false,
      // The shop the person is working in is recorded with the product (F01 §8).
      locationId: "l1",
    });
    expect(post?.body).not.toHaveProperty("name");
  });

  it("asks for a price when the person may set prices", async () => {
    const { user, calls } = renderShop("/products/new", catalogRoutes());
    await fillPhone(user);
    await user.click(screen.getByRole("button", { name: "Save product" }));
    expect(await screen.findByText("This is needed.")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/products/check")).toBe(false);
  });

  it("blocks an exact duplicate and offers the existing product", async () => {
    const { user, calls } = renderShop(
      "/products/new",
      catalogRoutes({
        "POST /products/check": {
          body: { ...NO_PROBLEMS.body, exactDuplicate: makeProduct({ id: "p9" }) },
        },
      }),
    );
    await fillPhone(user);
    await user.type(screen.getByLabelText("Retail price"), "15500");
    await user.click(screen.getByRole("button", { name: "Save product" }));
    expect(await screen.findByText("This product already exists.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open the existing product" });
    expect(link).toHaveAttribute("href", "/products/p9");
    expect(calls.some((c) => c.method === "POST" && c.path === "/products")).toBe(false);
  });

  it("names the product that already has the barcode", async () => {
    const { user } = renderShop(
      "/products/new",
      catalogRoutes({
        "POST /products/check": {
          body: {
            ...NO_PROBLEMS.body,
            barcodeClashes: [
              {
                barcode: "6901234567892",
                product: makeProduct({ id: "p9", name: "Tecno Spark 20" }),
              },
            ],
          },
        },
      }),
    );
    await fillPhone(user);
    await user.type(screen.getByLabelText("Retail price"), "15500");
    await user.click(screen.getByRole("button", { name: "Save product" }));
    expect(
      await screen.findByText(/The barcode 6901234567892 belongs to Tecno Spark 20\./),
    ).toBeInTheDocument();
  });

  it("lists similar products, and 'Not the same, create' sends the acknowledgement", async () => {
    const { user, calls } = renderShop(
      "/products/new",
      catalogRoutes({
        "POST /products/check": {
          body: {
            ...NO_PROBLEMS.body,
            similar: [makeProduct({ id: "p8", name: "Galaxy A15 128GB" })],
          },
        },
        "POST /products": { status: 201, body: { product: created } },
        "GET /products/p1": { body: { product: created } },
      }),
    );
    await fillPhone(user);
    await user.type(screen.getByLabelText("Retail price"), "15500");
    await user.click(screen.getByRole("button", { name: "Save product" }));

    expect(await screen.findByText("Galaxy A15 128GB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use this one" })).toHaveAttribute(
      "href",
      "/products/p8",
    );
    expect(calls.some((c) => c.method === "POST" && c.path === "/products")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Not the same, create" }));
    expect(await screen.findByRole("heading", { name: created.name })).toBeVisible();
    const post = calls.find((c) => c.method === "POST" && c.path === "/products");
    expect(post?.body).toMatchObject({ acknowledgeSimilar: true });
  });

  it("hides pack sizes for IMEI products and offers them for quantity products", async () => {
    const { user } = renderShop("/products/new", catalogRoutes());
    await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.queryByText("Add a pack size")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "Chargers");
    expect(await screen.findByRole("button", { name: "Add a pack size" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "IMEI" }));
    expect(screen.queryByRole("button", { name: "Add a pack size" })).not.toBeInTheDocument();
  });

  it("shows no price fields to someone who may not set prices", async () => {
    const { user } = renderShop("/products/new", catalogRoutes(), accessFor("storekeeper"));
    await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    expect(screen.queryByLabelText("Retail price")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Wholesale price/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.queryByLabelText(/Lowest price/)).not.toBeInTheDocument();
  });

  it("shows prices to the owner", async () => {
    const { user } = renderShop("/products/new", catalogRoutes());
    await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    expect(screen.getByLabelText("Retail price")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByLabelText(/Lowest price/)).toBeInTheDocument();
  });

  it("asks for the VAT type only when the business charges VAT", async () => {
    const off = renderShop("/products/new", catalogRoutes({}, false));
    await off.user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    expect(screen.queryByLabelText("VAT type")).not.toBeInTheDocument();
    off.unmount();

    const on = renderShop("/products/new", catalogRoutes({}, true));
    await on.user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    const vat = screen.getByLabelText("VAT type");
    expect(within(vat).getByRole("option", { name: /Standard/ })).toBeInTheDocument();
  });

  it("copy opens the form filled in, without barcodes", async () => {
    const source = makeProduct({
      id: "p5",
      retailPrice: 1200000,
      barcodes: [
        { id: "b1", value: "6901234567892", kind: "manufacturer", packUnitId: null, active: true },
      ],
    });
    renderShop(
      "/products/new?copy=p5",
      catalogRoutes({ "GET /products/p5": { body: { product: source } } }),
    );
    expect(await screen.findByLabelText("Brand")).toHaveValue("Samsung");
    expect(screen.getByLabelText("Retail price")).toHaveValue("12000");
    expect(screen.getByTestId("name-preview")).toHaveTextContent("Samsung A15 128GB Black New");
    expect(screen.queryByText("6901234567892")).not.toBeInTheDocument();
  });
});
