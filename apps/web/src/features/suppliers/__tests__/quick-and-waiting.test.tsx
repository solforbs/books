import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop, shellReady } from "@/test/render-shop";
import {
  makeSupplier,
  managerNoApprove,
  receiverAccess,
  supplierBody,
  suppliersPage,
} from "@/test/supplier-fixtures";

const active = makeSupplier();
const waitingSupplier = makeSupplier({
  id: "w1",
  name: "Mama Fatuma Traders",
  phone: null,
  status: "waiting",
  addedBy: { id: "u2", name: "Juma Otieno" },
});

describe("Quick add (receiving staff)", () => {
  it("is offered to people who receive stock but cannot manage suppliers", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage([active]) }, receiverAccess);
    expect(await screen.findByRole("button", { name: "Add a supplier by name" })).toBeVisible();
  });

  it("is never offered to people who manage suppliers", async () => {
    renderShop("/suppliers", { "GET /suppliers": suppliersPage([active]) });
    await screen.findByText(active.name);
    expect(
      screen.queryByRole("button", { name: "Add a supplier by name" }),
    ).not.toBeInTheDocument();
  });

  it("sends the name only and confirms", async () => {
    const { user, calls } = renderShop(
      "/suppliers",
      {
        "GET /suppliers": suppliersPage([active]),
        "POST /suppliers/quick": { status: 201, body: supplierBody(waitingSupplier).body },
      },
      receiverAccess,
    );
    await user.click(await screen.findByRole("button", { name: "Add a supplier by name" }));
    await user.type(screen.getByLabelText("Supplier name"), "Mama Fatuma Traders");
    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    expect(await screen.findByText("Mama Fatuma Traders was added.")).toBeVisible();
    expect(calls.find((c) => c.path === "/suppliers/quick")?.body).toEqual({
      name: "Mama Fatuma Traders",
    });
  });

  it("asks before creating a supplier with a similar name", async () => {
    const { user, calls } = renderShop(
      "/suppliers",
      {
        "GET /suppliers": suppliersPage([active]),
        "POST /suppliers/quick": [
          {
            status: 409,
            body: {
              error: {
                code: "similar_suppliers",
                message: "x",
                details: { suppliers: [{ id: "s1", name: active.name }] },
              },
            },
          },
          { status: 201, body: supplierBody(waitingSupplier).body },
        ],
      },
      receiverAccess,
    );
    await user.click(await screen.findByRole("button", { name: "Add a supplier by name" }));
    await user.type(screen.getByLabelText("Supplier name"), "Eastleigh Phones");
    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    await user.click(await screen.findByRole("button", { name: "Not the same, create" }));
    await waitFor(() => expect(calls.filter((c) => c.path === "/suppliers/quick")).toHaveLength(2));
    expect(calls.filter((c) => c.path === "/suppliers/quick")[1]?.body).toEqual({
      name: "Eastleigh Phones",
      acknowledgeSimilar: true,
    });
  });
});

describe("Waiting suppliers (G1)", () => {
  it("shows an approver a link and a menu count, then the waiting list", async () => {
    const { user } = renderShop("/suppliers", {
      "GET /suppliers": suppliersPage([active, waitingSupplier]),
      "GET /suppliers/waiting": suppliersPage([waitingSupplier]),
    });
    await shellReady();
    expect((await screen.findAllByLabelText("1 supplier waiting for completion")).length).toBe(2);
    await user.click(await screen.findByRole("link", { name: /1 supplier needs a phone number/ }));
    expect(await screen.findByRole("heading", { name: "Suppliers to complete" })).toBeVisible();
    expect(screen.getByText("Mama Fatuma Traders")).toBeVisible();
    expect(screen.getByText(/Added by Juma Otieno/)).toBeVisible();
  });

  it("does not ask for the waiting list, or show waiting wording, to non-approvers", async () => {
    const { calls } = renderShop(
      "/suppliers/waiting",
      { "GET /suppliers": suppliersPage([active]) },
      managerNoApprove,
    );
    await screen.findByRole("heading", { name: "Suppliers" });
    expect(calls.some((c) => c.path === "/suppliers/waiting")).toBe(false);
    expect(document.body.textContent).not.toMatch(/approv|waiting|complete/i);
  });

  it("an approver with nothing waiting never sees waiting wording", async () => {
    const { calls } = renderShop("/suppliers/waiting", {
      "GET /suppliers": suppliersPage([active]),
      "GET /suppliers/waiting": suppliersPage([]),
    });
    await screen.findByRole("heading", { name: "Suppliers" });
    expect(calls.some((c) => c.path === "/suppliers/waiting")).toBe(true);
    expect(document.body.textContent).not.toMatch(/approv|waiting|complete/i);
  });

  it("will not complete a supplier without a phone number", async () => {
    const { user, calls } = renderShop("/suppliers/waiting", {
      "GET /suppliers/waiting": suppliersPage([waitingSupplier]),
    });
    await user.click(await screen.findByRole("button", { name: "Add phone and complete" }));
    await user.click(screen.getByRole("button", { name: "Complete supplier" }));
    expect(await screen.findByText("This is needed.")).toBeVisible();
    expect(calls.some((c) => c.path === "/suppliers/w1/approve")).toBe(false);
  });

  it("completes a supplier with the phone, plus any fix", async () => {
    const { user, calls } = renderShop("/suppliers/waiting", {
      "GET /suppliers/waiting": [suppliersPage([waitingSupplier]), suppliersPage([])],
      "GET /suppliers": suppliersPage([active]),
      "POST /suppliers/w1/approve": supplierBody({ ...waitingSupplier, status: "active" }),
    });
    await user.click(await screen.findByRole("button", { name: "Add phone and complete" }));
    await user.type(screen.getByLabelText("Phone number"), "0733 111 222");
    await user.click(screen.getByRole("radio", { name: "Pay as you sell" }));
    await user.click(screen.getByRole("button", { name: "Complete supplier" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/suppliers/w1/approve")).toBe(true));
    expect(calls.find((c) => c.path === "/suppliers/w1/approve")?.body).toEqual({
      phone: "+254733111222",
      paymentRule: { type: "pay_as_you_sell" },
    });
  });

  it("shows the phone-taken answer when completing", async () => {
    const { user } = renderShop("/suppliers/waiting", {
      "GET /suppliers/waiting": suppliersPage([waitingSupplier]),
      "POST /suppliers/w1/approve": {
        status: 409,
        body: {
          error: {
            code: "supplier_phone_exists",
            message: "x",
            details: { existingId: "s1", existingName: "Eastleigh Phones Ltd" },
          },
        },
      },
    });
    await user.click(await screen.findByRole("button", { name: "Add phone and complete" }));
    await user.type(screen.getByLabelText("Phone number"), "0712345678");
    await user.click(screen.getByRole("button", { name: "Complete supplier" }));
    expect(await screen.findByRole("link", { name: "Open this supplier" })).toHaveAttribute(
      "href",
      "/suppliers/s1",
    );
  });

  it("shows other errors from completing in plain words", async () => {
    const { user } = renderShop("/suppliers/waiting", {
      "GET /suppliers/waiting": suppliersPage([waitingSupplier]),
      "POST /suppliers/w1/approve": apiError(409, "not_waiting"),
    });
    await user.click(await screen.findByRole("button", { name: "Add phone and complete" }));
    await user.type(screen.getByLabelText("Phone number"), "0712345678");
    await user.click(screen.getByRole("button", { name: "Complete supplier" }));
    expect(await screen.findByText(/not waiting for approval or completion/)).toBeVisible();
  });
});
