import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { chargersCategory, makeCategory } from "@/test/catalog-fixtures";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { accessFor } from "@/test/shop-fixtures";

const phones = makeCategory({ productCount: 3 });
const list = { body: { categories: [phones, chargersCategory] } };

describe("Settings -> Product categories", () => {
  it("lists categories with how they are tracked and named", async () => {
    renderShop("/settings/categories", { "GET /product-categories": list });
    expect(await screen.findByText("Phones")).toBeInTheDocument();
    expect(screen.getByText(/IMEI · Built from parts/)).toBeInTheDocument();
    expect(screen.getByText(/Quantity only · Typed by hand/)).toBeInTheDocument();
    expect(screen.getByText(/3 products/)).toBeInTheDocument();
  });

  it("adds a category with a default tracking type and naming mode", async () => {
    const created = makeCategory({ id: "c-laptops", name: "Laptops", defaultTracking: "serial" });
    const { user, calls } = renderShop("/settings/categories", {
      "GET /product-categories": list,
      "POST /product-categories": { status: 201, body: { category: created } },
    });
    await user.click(await screen.findByRole("button", { name: "Add category" }));
    await user.type(screen.getByLabelText("Category name"), "Laptops");
    await user.click(screen.getByRole("radio", { name: "Serial number" }));
    await user.click(screen.getByRole("radio", { name: /Built from parts/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Phones");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      name: "Laptops",
      defaultTracking: "serial",
      namingMode: "parts",
    });
  });

  it("says clearly why a category that is still used cannot be hidden", async () => {
    const { user } = renderShop("/settings/categories", {
      "GET /product-categories": list,
      "PATCH /product-categories/c-phones": apiError(409, "category_in_use"),
    });
    await screen.findByText("Phones");
    await user.click(screen.getAllByRole("button", { name: "Hide" })[0] as HTMLElement);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This category still has 3 products. Move them to another category first.",
    );
  });

  it("shows a friendly message when the name is already used", async () => {
    const { user } = renderShop("/settings/categories", {
      "GET /product-categories": list,
      "POST /product-categories": apiError(409, "category_exists"),
    });
    await user.click(await screen.findByRole("button", { name: "Add category" }));
    await user.type(screen.getByLabelText("Category name"), "Phones");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You already have a category with this name.",
    );
  });

  it("is only for people who can manage products", async () => {
    renderShop("/settings/categories", { "GET /product-categories": list }, accessFor("cashier"));
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
    expect(screen.queryByText("Product categories")).not.toBeInTheDocument();
  });
});
