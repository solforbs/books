import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import {
  costNoPayAccess,
  deliveryBody,
  makeDelivery,
  storekeeperAccess,
} from "@/test/receiving-fixtures";
import { receiverAccess } from "@/test/supplier-fixtures";
import { findRow, openStockIn, pickSupplier, postedDelivery, scan } from "./stock-in-helpers";

async function chargerWithTotal(user: Parameters<typeof pickSupplier>[0], total: string) {
  await pickSupplier(user);
  await scan(user, "6901234567890");
  const row = await findRow("Oraimo 20W Charger");
  if (total) await user.type(row.getByLabelText("Amount"), total);
  return row;
}

describe("Stock in: payment", () => {
  it("is credit by default and says what is owed", async () => {
    const { user } = openStockIn();
    await chargerWithTotal(user, "1000");
    expect(screen.getByRole("heading", { name: "Payment" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "On credit" })).toBeChecked();
    expect(screen.getByText(/Known cost: KES 1,000/)).toBeVisible();
  });

  it("pays part from one money place", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("radio", { name: "Part paid" }));
    await user.type(screen.getByLabelText("Amount", { selector: "#amount-pay-0" }), "400");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      payments: [{ moneyPlaceId: "mp-drawer-l1", amountCents: 40_000 }],
    });
  });

  it("pays in full with the whole known cost prefilled", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("radio", { name: "Paid in full" }));
    expect(screen.getByLabelText("Amount", { selector: "#amount-pay-0" })).toHaveValue("1000");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      payments: [{ moneyPlaceId: "mp-drawer-l1", amountCents: 100_000 }],
    });
  });

  it("refuses a part payment that is as much as the whole cost, or more", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("radio", { name: "Part paid" }));
    const amount = screen.getByLabelText("Amount", { selector: "#amount-pay-0" });
    await user.type(amount, "1000");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("That pays everything. Choose Paid in full.")).toBeVisible();
    await user.clear(amount);
    await user.type(amount, "1500");
    expect(await screen.findByText("The payment is more than the cost.")).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
  });

  it("does not allow paying in full while a line has no cost", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await scan(user, "iphone");
    await findRow("iPhone 13 Pro 128GB Blue New");
    await user.click(screen.getByRole("radio", { name: "Paid in full" }));
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText(/A line without a cost cannot be paid in full/)).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
  });

  it("sends a payment rule for this delivery only after it is changed", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await user.click(
      screen.getByRole("button", { name: "Different payment rule for this delivery only" }),
    );
    await user.click(screen.getByRole("radio", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({ paymentRule: { type: "cash" } });
  });

  it("does not send a payment rule when it was not changed", async () => {
    const { user, calls } = openStockIn();
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).not.toHaveProperty("paymentRule");
  });

  it("repeats the same commandId when the same request is retried", async () => {
    const { user, calls } = openStockIn({
      "POST /deliveries": [
        apiError(500, "unknown"),
        { status: 201, body: deliveryBody(makeDelivery()).body },
      ],
    });
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    const [first, second] = postedDelivery(calls);
    expect((first?.body as { commandId: string }).commandId).toBe(
      (second?.body as { commandId: string }).commandId,
    );
  });

  it("uses a new commandId when the sheet changed between tries", async () => {
    const { user, calls } = openStockIn({
      "POST /deliveries": [
        apiError(500, "unknown"),
        { status: 201, body: deliveryBody(makeDelivery()).body },
      ],
    });
    const row = await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Something went wrong. Please try again.");
    await user.type(row.getByLabelText("Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    const [first, second] = postedDelivery(calls);
    expect((first?.body as { commandId: string }).commandId).not.toBe(
      (second?.body as { commandId: string }).commandId,
    );
  });

  it("shows a plain message for an overdrawn money place", async () => {
    const { user } = openStockIn({ "POST /deliveries": apiError(409, "insufficient_funds") });
    await chargerWithTotal(user, "1000");
    await user.click(screen.getByRole("radio", { name: "Paid in full" }));
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(
      await screen.findByText("There is not enough money in that place to pay this."),
    ).toBeVisible();
  });
});

describe("Stock in: permissions", () => {
  it("hides costs and payment from people who cannot see costs", async () => {
    const { user, calls } = openStockIn({}, storekeeperAccess);
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await findRow("Oraimo 20W Charger");
    expect(row.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(row.getByText("Cost to be added")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Payment" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    const body = postedDelivery(calls)[0]?.body as { payments: unknown[]; lines: object[] };
    expect(body.payments).toEqual([]);
    expect(body.lines[0]).not.toHaveProperty("lineTotalCents");
    expect(body).not.toHaveProperty("paymentRule");
  });

  it("shows costs but hides payment from people who cannot pay suppliers", async () => {
    const { user } = openStockIn({}, costNoPayAccess);
    await chargerWithTotal(user, "1000");
    expect(screen.queryByRole("heading", { name: "Payment" })).not.toBeInTheDocument();
    expect(screen.getByTestId("total-cost")).toHaveTextContent("KES 1,000");
  });

  it("offers receiving staff the quick add of a supplier by name", async () => {
    const { user, calls } = openStockIn(
      {
        "POST /suppliers/quick": {
          status: 201,
          body: {
            supplier: {
              id: "w1",
              name: "Mama Fatuma Traders",
              phone: null,
              paymentRule: { type: "cash" },
              status: "waiting",
              addedBy: { id: "u2", name: "Juma Otieno" },
              createdAt: "2026-11-12T09:00:00.000Z",
            },
          },
        },
      },
      receiverAccess,
    );
    await user.click(await screen.findByRole("button", { name: "Add a supplier by name" }));
    await user.type(screen.getByLabelText("Supplier name"), "Mama Fatuma Traders");
    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    expect(await screen.findByText("Mama Fatuma Traders")).toBeVisible();
    expect(screen.getByText("Waiting")).toBeVisible();
    expect(calls.find((c) => c.path === "/suppliers/quick")?.body).toEqual({
      name: "Mama Fatuma Traders",
    });
  });
});
