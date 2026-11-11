import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { catalogRoutes, makeProduct } from "@/test/catalog-fixtures";
import { renderShop } from "@/test/render-shop";

async function chips(user: UserEvent, label: string, values: string[]) {
  const box = screen.getByLabelText(label);
  for (const value of values) await user.type(box, `${value}{Enter}`);
}

/** Phones -> Apple iPhone 13 Pro, 2 storages x 3 colours x 1 condition. */
async function fillIphone(user: UserEvent) {
  await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
  await user.type(screen.getByLabelText("Brand"), "Apple");
  await user.type(screen.getByLabelText("Model"), "iPhone 13 Pro");
  await chips(user, "Storage", ["128GB", "256GB"]);
  await chips(user, "Colour", ["Blue", "Gold", "Graphite"]);
  await chips(user, "Condition", ["New"]);
}

describe("Create several at once", () => {
  it("lists storages x colours x conditions: 2 x 3 x 1 = 6 products", async () => {
    const { user } = renderShop("/products/bulk", catalogRoutes());
    await fillIphone(user);
    expect(screen.getByText("2 × 3 × 1 = 6 products")).toBeInTheDocument();
    expect(screen.getByText("Apple iPhone 13 Pro 128GB Blue New")).toBeInTheDocument();
    expect(screen.getByText("Apple iPhone 13 Pro 256GB Graphite New")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Create 6 products" })).toBeEnabled();
  });

  it("gives every row the same price, lets rows be unticked, and sends one request", async () => {
    const { user, calls } = renderShop(
      "/products/bulk",
      catalogRoutes({
        "POST /products/bulk": (init) => {
          const { items } = JSON.parse(String(init.body)) as { items: { colour: string }[] };
          return {
            body: {
              results: items.map((item, index) => ({
                index,
                product: makeProduct({ id: `n${index}`, name: `Apple ${item.colour}` }),
                error: null,
              })),
            },
          };
        },
      }),
    );
    await fillIphone(user);
    await user.type(screen.getByLabelText("Same price for all"), "85,000");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("checkbox", { name: "Apple iPhone 13 Pro 256GB Gold New" }));
    await user.click(screen.getByRole("button", { name: "Create 5 products" }));

    expect(await screen.findByText("5 products created.")).toBeInTheDocument();
    const post = calls.find((c) => c.path === "/products/bulk");
    const { items } = post?.body as { items: Record<string, unknown>[] };
    expect(items).toHaveLength(5);
    expect(items[0]).toMatchObject({
      categoryId: "c-phones",
      brand: "Apple",
      model: "iPhone 13 Pro",
      storage: "128GB",
      colour: "Blue",
      condition: "New",
      retailPrice: 8500000,
      source: "bulk",
      locationId: "l1",
    });
  });

  it("shows what happened to each row and highlights the ones that failed", async () => {
    const similar = makeProduct({ id: "p7", name: "Galaxy A15 128GB" });
    const { user, calls } = renderShop(
      "/products/bulk",
      catalogRoutes({
        "POST /products/bulk": [
          {
            body: {
              results: [
                { index: 0, product: makeProduct({ id: "n0" }), error: null },
                {
                  index: 1,
                  product: null,
                  error: { code: "duplicate_product", details: { existingId: "p9" } },
                },
                {
                  index: 2,
                  product: null,
                  error: { code: "similar_products", details: { products: [similar] } },
                },
                { index: 3, product: null, error: { code: "validation_failed" } },
              ],
            },
          },
          { body: { results: [{ index: 0, product: makeProduct({ id: "n2" }), error: null }] } },
        ],
      }),
    );
    await user.selectOptions(await screen.findByLabelText("Category"), "Phones");
    await user.type(screen.getByLabelText("Brand"), "Apple");
    await user.type(screen.getByLabelText("Model"), "iPhone 13");
    await chips(user, "Storage", ["128GB"]);
    await chips(user, "Colour", ["Blue", "Gold", "Graphite", "Red"]);
    await chips(user, "Condition", ["New"]);
    await user.type(screen.getByLabelText("Same price for all"), "85000");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Create 4 products" }));

    const rows = await screen.findAllByRole("listitem");
    const row = (name: string) => rows.find((r) => within(r).queryByText(name)) as HTMLElement;
    expect(within(row("Apple iPhone 13 128GB Blue New")).getByText("Created.")).toBeInTheDocument();
    expect(row("Apple iPhone 13 128GB Gold New")).toHaveAttribute("data-state", "failed");
    expect(within(row("Apple iPhone 13 128GB Gold New")).getByText(/already exists/)).toBeVisible();
    expect(
      within(row("Apple iPhone 13 128GB Graphite New")).getByText(/Galaxy A15 128GB/),
    ).toBeVisible();
    expect(
      within(row("Apple iPhone 13 128GB Red New")).getByText(/Some details are not correct/),
    ).toBeVisible();

    // The similar row can be created anyway; it is sent alone with the acknowledgement.
    await user.click(
      within(row("Apple iPhone 13 128GB Graphite New")).getByRole("button", {
        name: "Not the same, create",
      }),
    );
    const retry = calls.filter((c) => c.path === "/products/bulk")[1];
    const { items } = retry?.body as { items: { colour: string; acknowledgeSimilar: boolean }[] };
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ colour: "Graphite", acknowledgeSimilar: true });
    expect(
      await within(row("Apple iPhone 13 128GB Graphite New")).findByText("Created."),
    ).toBeVisible();
  });

  it("flags a row without a price instead of sending it", async () => {
    const { user, calls } = renderShop("/products/bulk", catalogRoutes());
    await fillIphone(user);
    await user.click(screen.getByRole("button", { name: "Create 6 products" }));
    expect((await screen.findAllByText("Enter a price for this product.")).length).toBe(6);
    expect(calls.some((c) => c.path === "/products/bulk")).toBe(false);
  });
});
