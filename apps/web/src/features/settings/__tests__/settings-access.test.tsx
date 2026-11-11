import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderShop } from "@/test/render-shop";
import { accessFor, makeAccess, makeMember } from "@/test/shop-fixtures";

const navLinks = () =>
  within(screen.getAllByRole("navigation", { name: "Main menu" })[0] as HTMLElement)
    .getAllByRole("link")
    .map((l) => l.textContent);

describe("Settings by permission", () => {
  it("an owner sees every Settings page", async () => {
    const { user } = renderShop("/");
    await screen.findByText("Hello, Amina Hassan");
    expect(navLinks()).toEqual(["Home", "Products", "Suppliers", "Settings"]);
    await user.click(screen.getAllByRole("link", { name: "Settings" })[0] as HTMLElement);
    for (const name of ["Business details", "Locations", "Money places", "Staff"]) {
      expect(await screen.findByRole("link", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("a cashier has no Settings at all, not even by address", async () => {
    renderShop("/settings/staff", {}, accessFor("cashier"));
    expect(await screen.findByText("Hello, Amina Hassan")).toBeInTheDocument();
    expect(navLinks()).toEqual(["Home", "Products", "Suppliers"]);
  });

  it("a cashier switched on for business details sees only that entry", async () => {
    const access = accessFor("cashier");
    access.permissions.push("manage_business");
    renderShop("/settings", {}, access);
    expect(await screen.findByRole("link", { name: /Business details/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Locations/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Money places/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Staff/ })).not.toBeInTheDocument();
  });

  it("a one-person shop sees no approval wording anywhere (G1)", async () => {
    const { user } = renderShop(
      "/",
      { "GET /staff": { body: { members: [makeMember()] } } },
      makeAccess({ approvalsActive: false }),
    );
    await screen.findByText("Hello, Amina Hassan");
    expect(document.body.textContent).not.toMatch(/approv|waiting/i);
    for (const path of ["Settings", "Staff", "Amina Hassan"]) {
      await user.click((await screen.findAllByRole("link", { name: new RegExp(path) }))[0]!);
      expect(document.body.textContent).not.toMatch(/approv|waiting/i);
    }
  });
});

describe("Settings -> Business details", () => {
  const business = {
    id: "t1",
    name: "Luthuli Phones",
    address: null,
    phone: null,
    email: null,
    kraPin: null,
    footerNote: null,
    vatEnabled: false,
    createdAt: "2026-11-01T08:00:00.000Z",
  };

  it("checks the KRA PIN format, then saves with VAT off by default", async () => {
    const { user, calls } = renderShop("/settings/business", {
      "GET /business": { body: { business } },
      "PUT /business": { body: { business: { ...business, name: "Luthuli Phones Ltd" } } },
    });
    const vat = await screen.findByRole("switch", { name: /Charge VAT/ });
    expect(vat).not.toBeChecked();
    await user.type(screen.getByLabelText("KRA PIN (optional)"), "123");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(/A KRA PIN is one letter, 9 numbers/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);

    await user.clear(screen.getByLabelText("KRA PIN (optional)"));
    await user.type(screen.getByLabelText("KRA PIN (optional)"), "a123456789b");
    await user.clear(screen.getByLabelText("Business name"));
    await user.type(screen.getByLabelText("Business name"), "Luthuli Phones Ltd");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.body).toMatchObject({
      name: "Luthuli Phones Ltd",
      kraPin: "A123456789B",
      vatEnabled: false,
    });
    // The top bar follows the new name.
    expect(screen.getByTestId("business-name")).toHaveTextContent("Luthuli Phones Ltd");
  });
});
