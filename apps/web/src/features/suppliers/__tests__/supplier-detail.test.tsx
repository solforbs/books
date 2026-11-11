import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { makeSupplier, receiverAccess, supplierBody } from "@/test/supplier-fixtures";

const supplier = makeSupplier({
  paymentRule: { type: "within_time", period: { value: 2, unit: "weeks" } },
  kraPin: "A123456789B",
  marketOrLocation: "Eastleigh",
});

describe("Supplier page", () => {
  it("explains the rule in one sentence and notes that changes apply to new deliveries", async () => {
    renderShop("/suppliers/s1", { "GET /suppliers/s1": supplierBody(supplier) });
    expect(await screen.findByRole("heading", { name: "Eastleigh Phones Ltd" })).toBeVisible();
    expect(
      screen.getByText("You pay this supplier within 2 weeks after each delivery."),
    ).toBeVisible();
    expect(screen.getByText(/applies to new deliveries only/)).toBeVisible();
    expect(screen.getByText("A123456789B")).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/suppliers/s1/edit",
    );
  });

  it("is read-only for people who cannot manage suppliers", async () => {
    renderShop("/suppliers/s1", { "GET /suppliers/s1": supplierBody(supplier) }, receiverAccess);
    await screen.findByRole("heading", { name: "Eastleigh Phones Ltd" });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hide supplier" })).not.toBeInTheDocument();
  });

  it("sends only what changed when editing", async () => {
    const { user, calls } = renderShop("/suppliers/s1/edit", {
      "GET /suppliers/s1": supplierBody(supplier),
      "PATCH /suppliers/s1": supplierBody(supplier),
    });
    const phone = await screen.findByLabelText("Phone number");
    await user.clear(phone);
    await user.type(phone, "0722111222");
    await user.click(screen.getByRole("radio", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({
      phone: "+254722111222",
      paymentRule: { type: "cash" },
    });
  });

  it("hides a supplier after a confirmation", async () => {
    const { user, calls } = renderShop("/suppliers/s1", {
      "GET /suppliers/s1": supplierBody(supplier),
      "POST /suppliers/s1/hide": supplierBody({ ...supplier, status: "hidden" }),
    });
    await user.click(await screen.findByRole("button", { name: "Hide supplier" }));
    await user.click(screen.getByRole("button", { name: "Hide supplier" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/suppliers/s1/hide")).toBe(true));
  });

  it("explains in plain words why a supplier with a balance cannot be hidden", async () => {
    const { user } = renderShop("/suppliers/s1", {
      "GET /suppliers/s1": supplierBody(supplier),
      "POST /suppliers/s1/hide": apiError(409, "supplier_has_balance"),
    });
    await user.click(await screen.findByRole("button", { name: "Hide supplier" }));
    await user.click(screen.getByRole("button", { name: "Hide supplier" }));
    expect(await screen.findByText(/Settle the balance first, then hide them/)).toBeVisible();
  });

  it("shows a hidden supplier again", async () => {
    const { user, calls } = renderShop("/suppliers/s1", {
      "GET /suppliers/s1": supplierBody({ ...supplier, status: "hidden" }),
      "POST /suppliers/s1/unhide": supplierBody(supplier),
    });
    await user.click(await screen.findByRole("button", { name: "Show supplier again" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/suppliers/s1/unhide")).toBe(true));
  });

  it("says a missing supplier was not found", async () => {
    renderShop("/suppliers/zzz", { "GET /suppliers/zzz": apiError(404, "supplier_not_found") });
    expect(await screen.findByText("This supplier was not found.")).toBeVisible();
  });
});
