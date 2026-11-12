import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import { renderShop } from "@/test/render-shop";
import { makeSupplier, supplierBody } from "@/test/supplier-fixtures";

const created = makeSupplier({ id: "s9", name: "Dubai Gadgets" });

async function fillBasics(user: UserEvent, name: string, phone: string) {
  await user.type(await screen.findByLabelText("Supplier name"), name);
  await user.type(screen.getByLabelText("Phone number"), phone);
}

const postCall = (calls: { method: string; path: string; body: unknown }[]) =>
  calls.find((c) => c.method === "POST" && c.path === "/suppliers");

describe("Add a supplier", () => {
  it("sends a Kenyan phone normalized, cash by default, and opens the new supplier", async () => {
    const { user, calls } = renderShop("/suppliers/new", {
      "POST /suppliers": { status: 201, body: supplierBody(created).body },
      "GET /suppliers/s9": supplierBody(created),
    });
    await fillBasics(user, "Dubai Gadgets", "0712 345 678");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { name: "Dubai Gadgets" })).toBeVisible();
    expect(postCall(calls)?.body).toEqual({
      name: "Dubai Gadgets",
      phone: "+254712345678",
      paymentRule: { type: "cash" },
      currency: "KES",
      isNeighbour: false,
    });
  });

  it("accepts an international number and explains the + hint", async () => {
    const { user, calls } = renderShop("/suppliers/new", {
      "POST /suppliers": { status: 201, body: supplierBody(created).body },
      "GET /suppliers/s9": supplierBody(created),
    });
    expect(await screen.findByText(/Dubai and China numbers start with \+/)).toBeVisible();
    await fillBasics(user, "Dubai Gadgets", "+971 50 123 4567");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("heading", { name: "Dubai Gadgets" });
    expect((postCall(calls)?.body as { phone: string }).phone).toBe("+971501234567");
  });

  it("rejects a number that is neither Kenyan nor international", async () => {
    const { user, calls } = renderShop("/suppliers/new");
    await fillBasics(user, "Dubai Gadgets", "12345");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Enter a Kenyan number like 0712/)).toBeVisible();
    expect(postCall(calls)).toBeUndefined();
  });

  it("sends a rule with its period, USD and neighbour from behind More", async () => {
    const { user, calls } = renderShop("/suppliers/new", {
      "POST /suppliers": { status: 201, body: supplierBody(created).body },
      "GET /suppliers/s9": supplierBody(created),
    });
    await fillBasics(user, "Dubai Gadgets", "+971501234567");
    await user.click(screen.getByRole("radio", { name: "Pay within a time" }));
    await user.clear(screen.getByLabelText("How many"));
    await user.type(screen.getByLabelText("How many"), "2");
    await user.selectOptions(screen.getByLabelText("Days, weeks or months"), "Weeks");
    expect(screen.queryByLabelText("KRA PIN (optional)")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("radio", { name: "USD" }));
    await user.click(screen.getByRole("switch", { name: /Neighbour shop/ }));
    await user.type(screen.getByLabelText("KRA PIN (optional)"), "a123456789b");
    await user.type(screen.getByLabelText("Market or location (optional)"), "Dubai");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("heading", { name: "Dubai Gadgets" });
    expect(postCall(calls)?.body).toEqual({
      name: "Dubai Gadgets",
      phone: "+971501234567",
      paymentRule: { type: "within_time", period: { value: 2, unit: "weeks" } },
      currency: "USD",
      isNeighbour: true,
      kraPin: "A123456789B",
      marketOrLocation: "Dubai",
    });
  });

  it("needs a period number for the time-based rules", async () => {
    const { user, calls } = renderShop("/suppliers/new");
    await fillBasics(user, "Dubai Gadgets", "0712345678");
    await user.click(screen.getByRole("radio", { name: "Pay after sold, with a latest date" }));
    await user.clear(screen.getByLabelText("How many"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a whole number, like 2.")).toBeVisible();
    expect(postCall(calls)).toBeUndefined();
  });

  it("says which supplier already has the phone and links to it", async () => {
    const { user } = renderShop("/suppliers/new", {
      "POST /suppliers": {
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
    await fillBasics(user, "Another Name", "0712345678");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Another supplier already has this phone/)).toBeVisible();
    expect(screen.getByText("Eastleigh Phones Ltd")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open this supplier" })).toHaveAttribute(
      "href",
      "/suppliers/s1",
    );
  });

  it("lists similar suppliers and creates with acknowledgeSimilar when told it is not the same", async () => {
    const similar = {
      status: 409,
      body: {
        error: {
          code: "similar_suppliers",
          message: "x",
          details: { suppliers: [{ id: "s1", name: "Eastleigh Phones Ltd" }] },
        },
      },
    };
    const { user, calls } = renderShop("/suppliers/new", {
      "POST /suppliers": [similar, { status: 201, body: supplierBody(created).body }],
      "GET /suppliers/s9": supplierBody(created),
    });
    await fillBasics(user, "Eastleigh Phones", "0733000111");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/similar name already exists/)).toBeVisible();
    expect(screen.getByText("Eastleigh Phones Ltd")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Not the same, create" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "POST" && c.path === "/suppliers")).toHaveLength(2),
    );
    const second = calls.filter((c) => c.method === "POST" && c.path === "/suppliers")[1];
    expect(second?.body).toMatchObject({ name: "Eastleigh Phones", acknowledgeSimilar: true });
  });

  it("shows other API errors in plain words", async () => {
    const { user } = renderShop("/suppliers/new", {
      "POST /suppliers": apiError(403, "forbidden"),
    });
    await fillBasics(user, "Dubai Gadgets", "0712345678");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/You are not allowed to do this/)).toBeVisible();
  });
});
