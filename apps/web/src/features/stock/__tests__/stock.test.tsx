import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IMEI_A, makeStockRow, makeStockUnit } from "@/test/receiving-fixtures";
import { makeAccess } from "@/test/shop-fixtures";
import { renderShop, shellReady } from "@/test/render-shop";
import { noSupplierAccess } from "@/test/supplier-fixtures";

const rows = [
  makeStockRow(),
  makeStockRow({
    productId: "p-iphone",
    productName: "iPhone 13 Pro 128GB Blue New",
    trackingType: "imei",
    onHand: 2,
    incomplete: 1,
    costMissing: 2,
    valueCents: null,
  }),
];

describe("Stock screen", () => {
  it("shows what is on hand by product and location, with the attention notes", async () => {
    renderShop("/stock", { "GET /stock": { body: { rows, nextCursor: null } } });
    const list = await screen.findByRole("list", { name: "Stock" });
    expect(within(list).getByText("50 in stock")).toBeVisible();
    expect(within(list).getByText("Worth KES 22,500")).toBeVisible();
    expect(within(list).getByText("1 waiting for its IMEI or serial number")).toBeVisible();
    expect(within(list).getByText("2 without a cost")).toBeVisible();
    // No value is shown where the server sent none (people who cannot see costs).
    expect(within(list).getAllByText(/Worth KES/)).toHaveLength(1);
  });

  it("is read only: there is nothing to add or change", async () => {
    renderShop("/stock", { "GET /stock": { body: { rows, nextCursor: null } } });
    await screen.findByRole("list", { name: "Stock" });
    expect(screen.queryByRole("button", { name: /save|add|change/i })).not.toBeInTheDocument();
  });

  it("says when there is no stock yet", async () => {
    renderShop("/stock", { "GET /stock": { body: { rows: [], nextCursor: null } } });
    expect(await screen.findByText(/No stock yet/)).toBeVisible();
  });

  it("is open to people who manage products or view reports, but not to others", async () => {
    renderShop(
      "/stock",
      { "GET /stock": { body: { rows, nextCursor: null } } },
      makeAccess({ role: "accountant", permissions: ["view_reports"], locationIds: ["l1"] }),
    );
    expect(await screen.findByRole("list", { name: "Stock" })).toBeVisible();
  });

  it("sends people without any of the three permissions home", async () => {
    renderShop("/stock", {}, noSupplierAccess);
    await shellReady();
    expect(screen.queryByRole("heading", { name: "Stock" })).not.toBeInTheDocument();
  });
});

describe("IMEI lookup", () => {
  it("finds a unit by IMEI and shows its status and place", async () => {
    const { user, calls } = renderShop("/stock", {
      "GET /stock": { body: { rows, nextCursor: null } },
      [`GET /stock/lookup?number=${IMEI_A}`]: {
        body: {
          units: [
            makeStockUnit(),
            makeStockUnit({
              id: "su0",
              status: "sold",
              location: { id: "l1", name: "Luthuli Shop 1" },
            }),
          ],
        },
      },
    });
    await user.type(
      await screen.findByLabelText("Find a phone by IMEI or serial number"),
      "4901 5420-3237 518",
    );
    await user.click(screen.getByRole("button", { name: "Find" }));
    const results = await screen.findByRole("list", { name: "Results" });
    expect(within(results).getByText(/In stock - Shop 2/)).toBeVisible();
    expect(within(results).getByText(/Sold - Luthuli Shop 1/)).toBeVisible();
    expect(calls.some((c) => c.path === `/stock/lookup?number=${IMEI_A}`)).toBe(true);
  });

  it("says when nothing is found", async () => {
    const { user } = renderShop("/stock", {
      "GET /stock": { body: { rows, nextCursor: null } },
      "GET /stock/lookup?number=000": { body: { units: [] } },
    });
    await user.type(await screen.findByLabelText("Find a phone by IMEI or serial number"), "000");
    await user.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByText("Nothing found for 000.")).toBeVisible();
  });
});
