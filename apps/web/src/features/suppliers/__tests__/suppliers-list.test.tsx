import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderShop, shellReady } from "@/test/render-shop";
import {
  makeReducedSupplier,
  makeSupplier,
  noSupplierAccess,
  receiverAccess,
  suppliersPage,
} from "@/test/supplier-fixtures";

const rules = [
  makeSupplier({ id: "a", name: "Cash Co", paymentRule: { type: "cash" } }),
  makeSupplier({
    id: "b",
    name: "Monthly Co",
    phone: "+971501234567",
    paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
    currency: "USD",
  }),
  makeSupplier({ id: "c", name: "Sell Co", paymentRule: { type: "pay_as_you_sell" } }),
  makeSupplier({ id: "d", name: "Finish Co", paymentRule: { type: "pay_after_all_sold" } }),
  makeSupplier({
    id: "e",
    name: "Limit Co",
    isNeighbour: true,
    paymentRule: { type: "after_sold_with_latest_date", period: { value: 3, unit: "months" } },
  }),
  makeSupplier({ id: "f", name: "New Co", phone: null, status: "waiting" }),
];

describe("Suppliers list", () => {
  it("shows each payment rule in plain words, with the badges that matter", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage(rules) });
    const list = await screen.findByRole("list", { name: "Suppliers" });
    const text = (name: string) => within(list).getByText(name).closest("a")?.textContent ?? "";
    expect(text("Cash Co")).toContain("Cash");
    expect(text("Monthly Co")).toContain("Pay within 1 month");
    expect(text("Monthly Co")).toContain("USD");
    expect(text("Monthly Co")).toContain("+971501234567");
    expect(text("Sell Co")).toContain("Pay as you sell");
    expect(text("Finish Co")).toContain("Pay after all sold");
    expect(text("Limit Co")).toContain("Pay as you sell, latest 3 months");
    expect(text("Limit Co")).toContain("Neighbour shop");
    expect(text("New Co")).toContain("Waiting");
    expect(text("Cash Co")).not.toMatch(/Waiting|Hidden|USD/);
  });

  it("shows an empty state that leads to adding the first supplier", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage([]) });
    expect(await screen.findByText("No suppliers yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Add your first supplier" })).toHaveAttribute(
      "href",
      "/suppliers/new",
    );
  });

  it("searches by name and loads more pages", async () => {
    const { user, calls } = renderShop("/suppliers", {
      "GET /suppliers": [
        suppliersPage([makeSupplier({ id: "a", name: "Alpha" })], "cursor-2"),
        suppliersPage([makeSupplier({ id: "b", name: "Beta" })]),
      ],
    });
    await screen.findByText("Alpha");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Beta")).toBeVisible();
    expect(calls.some((c) => c.path.includes("cursor=cursor-2"))).toBe(true);
    await user.type(screen.getByLabelText("Search suppliers"), "bet");
    await waitFor(() => expect(calls.some((c) => c.path.includes("q=bet"))).toBe(true));
  });

  it("offers hidden suppliers to people who manage suppliers", async () => {
    const { user, calls } = renderShop("/suppliers", { "GET /suppliers": suppliersPage(rules) });
    await screen.findByText("Cash Co");
    await user.click(screen.getByLabelText("Show hidden suppliers"));
    await screen.findByText("Cash Co");
    expect(calls.some((c) => c.path.includes("status=hidden"))).toBe(true);
  });

  it("shows no balance or due-now columns", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage(rules) });
    await screen.findByText("Cash Co");
    expect(document.body.textContent).not.toMatch(/due now|owed|balance/i);
  });
});

describe("Suppliers in the main menu", () => {
  it("shows Suppliers to people who manage suppliers or receive stock", async () => {
    renderShop("/", { "GET /suppliers": suppliersPage([]) });
    await shellReady();
    expect((await screen.findAllByRole("link", { name: "Suppliers" })).length).toBeGreaterThan(0);
  });

  it("shows no Suppliers to a cashier without receive stock, and no page", async () => {
    const { calls } = renderShop("/suppliers", {}, noSupplierAccess);
    await shellReady();
    expect(screen.queryByRole("link", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith("/suppliers"))).toBe(false);
  });

  it("shows receiving staff the list without Add supplier", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage([rules[0]!]) }, receiverAccess);
    await screen.findByText("Cash Co");
    expect(screen.queryByRole("link", { name: "Add supplier" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Show hidden suppliers")).not.toBeInTheDocument();
  });

  it("lists reduced suppliers (no currency or neighbour) without badges", async () => {
    const reduced = makeReducedSupplier({ id: "r", name: "Reduced Co" });
    renderShop("/suppliers", { "GET /suppliers": suppliersPage([reduced]) }, receiverAccess);
    const row = (await screen.findByText("Reduced Co")).closest("a");
    expect(row?.textContent).not.toMatch(/USD|KES|Neighbour/);
  });
});
