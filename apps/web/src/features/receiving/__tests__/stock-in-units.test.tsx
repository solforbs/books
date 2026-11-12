import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import {
  IMEI_A,
  IMEI_B,
  IMEI_C,
  deliveryBody,
  makeDelivery,
  makeStockUnit,
  managerAccess,
  storekeeperAccess,
} from "@/test/receiving-fixtures";
import {
  findRow,
  openStockIn,
  pasteInto,
  pickSupplier,
  postedDelivery,
  scan,
} from "./stock-in-helpers";

const lookupRoute = (imei: string, units: ReturnType<typeof makeStockUnit>[]) => ({
  [`GET /stock/lookup?number=${imei}`]: { body: { units } },
});

async function addPhone(user: Parameters<typeof pickSupplier>[0], quantity: string) {
  await pickSupplier(user);
  await scan(user, "iphone");
  const row = await findRow("iPhone 13 Pro 128GB Blue New");
  await user.clear(row.getByLabelText("Quantity"));
  await user.type(row.getByLabelText("Quantity"), quantity);
  await user.click(row.getByRole("button", { name: new RegExp(`IMEIs 0/${quantity}`) }));
  return row;
}

describe("Stock in: IMEIs", () => {
  it("shows wrong, 14-digit and repeated IMEIs in red as the list is pasted", async () => {
    const { user, calls } = openStockIn();
    await addPhone(user, "4");
    await pasteInto(
      user,
      "Or paste a list, one per line",
      `${IMEI_A}\n${IMEI_A}\n12345678901234\n490154203237519`,
    );
    expect(screen.getAllByText(/It is entered twice in this delivery/)).toHaveLength(2);
    expect(screen.getByText(/Only 14 digits/)).toBeVisible();
    expect(screen.getAllByText(/Not a valid IMEI/)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(
      await screen.findByText("Some IMEIs or serial numbers are wrong. They are shown in red."),
    ).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
  });

  it("cleans spaces and dashes, and reads a second IMEI after a tab", async () => {
    const { user, calls } = openStockIn();
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", `4901 5420-3237 518\t${IMEI_B}`);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      lines: [{ units: [{ imei: IMEI_A, imei2: IMEI_B }] }],
    });
  });

  it("finds the same IMEI on two rows of the same delivery", async () => {
    const { user } = openStockIn();
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.type(
      screen.getByLabelText("Scan or type an IMEI, then press Enter"),
      `${IMEI_A}{Enter}`,
    );
    expect(await screen.findByText("It is entered twice in this delivery.")).toBeVisible();
  });

  it("T8: a scanned IMEI that is already in stock is refused with the place", async () => {
    const { user } = openStockIn(lookupRoute(IMEI_A, [makeStockUnit()]));
    await addPhone(user, "1");
    await user.type(
      screen.getByLabelText("Scan or type an IMEI, then press Enter"),
      `${IMEI_A}{Enter}`,
    );
    expect(await screen.findByText(`${IMEI_A} is already in stock at Shop 2.`)).toBeVisible();
    expect(screen.getByTestId("unit-count")).toHaveTextContent("0 of 1 numbers entered");
  });

  it("T8: when the server refuses a pasted IMEI it names the place", async () => {
    const { user } = openStockIn({
      "POST /deliveries": {
        status: 409,
        body: {
          error: {
            code: "imei_in_stock",
            message: "x",
            details: { imei: IMEI_A, locationName: "Shop 2" },
          },
        },
      },
    });
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText(`${IMEI_A} is already in stock at Shop 2.`)).toBeVisible();
  });

  it("falls back to the plain message when the server gives no place", async () => {
    const { user } = openStockIn({ "POST /deliveries": apiError(409, "imei_in_stock") });
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("This IMEI is already in stock.")).toBeVisible();
  });

  it("T9: 3 of 5 IMEIs can only be saved after choosing incomplete", async () => {
    const { user, calls } = openStockIn();
    await addPhone(user, "5");
    await pasteInto(user, "Or paste a list, one per line", `${IMEI_A}\n${IMEI_B}\n${IMEI_C}`);
    expect(screen.getByTestId("unit-count")).toHaveTextContent("3 of 5 numbers entered");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText(/switch on Save as incomplete/)).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);

    await user.click(screen.getByRole("switch", { name: /Save as incomplete/ }));
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      allowIncomplete: true,
      lines: [{ quantity: 5, units: [{ imei: IMEI_A }, { imei: IMEI_B }, { imei: IMEI_C }] }],
    });
  });

  it("does not allow more IMEIs than pieces", async () => {
    const { user, calls } = openStockIn();
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", `${IMEI_A}\n${IMEI_B}`);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("A product has more numbers than pieces.")).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
  });
});

describe("Stock in: an IMEI sold before", () => {
  const soldBefore = {
    "POST /deliveries": [
      {
        status: 409,
        body: {
          error: { code: "imei_sold_before", message: "x", details: { imei: IMEI_A } },
        },
      },
      { status: 201, body: deliveryBody(makeDelivery()).body },
    ],
  };

  it("lets an owner confirm and sends confirmSoldBefore with a new commandId", async () => {
    const { user, calls } = openStockIn(soldBefore);
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await user.click(await screen.findByRole("button", { name: "Confirm and save" }));
    await screen.findByText("Delivery saved.");
    const [first, second] = postedDelivery(calls);
    expect(first?.body).toMatchObject({ confirmSoldBefore: false });
    expect(second?.body).toMatchObject({ confirmSoldBefore: true });
    // The body changed, so the server must not see the same commandId (it would be a conflict).
    expect((second?.body as { commandId: string }).commandId).not.toBe(
      (first?.body as { commandId: string }).commandId,
    );
  });

  it("lets a manager confirm too", async () => {
    const { user } = openStockIn(soldBefore, managerAccess);
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByRole("button", { name: "Confirm and save" })).toBeVisible();
  });

  it("does not offer the confirmation to a storekeeper", async () => {
    const { user } = openStockIn(soldBefore, storekeeperAccess);
    await addPhone(user, "1");
    await pasteInto(user, "Or paste a list, one per line", IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("Ask the owner or a manager to confirm this.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm and save" })).not.toBeInTheDocument();
  });
});
