import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IMEI_A, IMEI_B, IMEI_C, boxed, productPage } from "@/test/receiving-fixtures";
import {
  expectQuantity,
  findRow,
  openStockIn,
  pasteInto,
  pickSupplier,
  postedDelivery,
  rowOf,
  scan,
} from "./stock-in-helpers";

describe("Stock in: the sheet", () => {
  it("T1: saves a credit delivery with two products and the IMEIs", async () => {
    const { user, calls } = openStockIn();
    await pickSupplier(user);
    expect(screen.getByText("Pay within 1 month")).toBeVisible();

    await scan(user, "6901234567890");
    const chargerRow = await findRow("Oraimo 20W Charger");
    await user.clear(chargerRow.getByLabelText("Quantity"));
    await user.type(chargerRow.getByLabelText("Quantity"), "50");
    await user.selectOptions(chargerRow.getByLabelText("Cost is"), "Cost each");
    await user.type(chargerRow.getByLabelText("Amount"), "450");

    await scan(user, "iphone");
    const phoneRow = await findRow("iPhone 13 Pro 128GB Blue New");
    await user.clear(phoneRow.getByLabelText("Quantity"));
    await user.type(phoneRow.getByLabelText("Quantity"), "3");
    await user.type(phoneRow.getByLabelText("Amount"), "285000");
    await user.click(phoneRow.getByRole("button", { name: /IMEIs 0\/3/ }));
    await pasteInto(user, "Or paste a list, one per line", `${IMEI_A}\n${IMEI_B}\n${IMEI_C}`);
    expect(screen.getByText("3 of 3 numbers entered")).toBeVisible();

    // 50 x 450 + 285,000 = 307,500
    expect(screen.getByTestId("total-cost")).toHaveTextContent("Total cost: KES 307,500");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));

    expect(await screen.findByText("Delivery saved.")).toBeVisible();
    const [post] = postedDelivery(calls);
    expect(post?.body).toMatchObject({
      supplierId: "s1",
      locationId: "l1",
      payments: [],
      allowIncomplete: false,
      confirmSoldBefore: false,
      lines: [
        { productId: "p-charger", quantity: 50, lineTotalCents: 2_250_000, units: [] },
        {
          productId: "p-iphone",
          quantity: 3,
          lineTotalCents: 28_500_000,
          units: [{ imei: IMEI_A }, { imei: IMEI_B }, { imei: IMEI_C }],
        },
      ],
    });
    expect((post?.body as { commandId: string }).commandId.length).toBeGreaterThanOrEqual(8);
    // Credit: nothing is sent as a payment and the delivery page shows what is owed.
    expect((await screen.findAllByText("KES 307,500")).length).toBeGreaterThan(0);
  });

  it("T2: scanning the same barcode again adds 1 to the same row", async () => {
    const { user } = openStockIn();
    await pickSupplier(user);
    for (let count = 1; count <= 5; count++) {
      await scan(user, "6901234567890");
      await expectQuantity("Oraimo 20W Charger", String(count));
    }
    expect(screen.getAllByRole("group", { name: "Oraimo 20W Charger" })).toHaveLength(1);
  });

  it("T3: a line total of 9,000 for 20 pieces is sent as cents and shows 450 each", async () => {
    const { user, calls } = openStockIn();
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await findRow("Oraimo 20W Charger");
    await user.clear(row.getByLabelText("Quantity"));
    await user.type(row.getByLabelText("Quantity"), "20");
    await user.type(row.getByLabelText("Amount"), "9000");
    expect(row.getByText("Cost each 450.00")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      lines: [{ quantity: 20, lineTotalCents: 900_000 }],
    });
  });

  it("T3: cost each is turned into a line total on the screen", async () => {
    const { user } = openStockIn();
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await findRow("Oraimo 20W Charger");
    await user.clear(row.getByLabelText("Quantity"));
    await user.type(row.getByLabelText("Quantity"), "20");
    await user.selectOptions(row.getByLabelText("Cost is"), "Cost each");
    await user.type(row.getByLabelText("Amount"), "450.50");
    expect(row.getByText("Line total 9,010.00")).toBeVisible();
  });

  it("T7: a line with no cost is saved as price pending (no line total sent)", async () => {
    const { user, calls } = openStockIn();
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await findRow("Oraimo 20W Charger");
    await user.clear(row.getByLabelText("Quantity"));
    await user.type(row.getByLabelText("Quantity"), "10");
    expect(row.getByText("Leave empty if the price is not known yet.")).toBeVisible();
    expect(screen.getByText("+ 1 line with cost to be added")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    const line = (postedDelivery(calls)[0]?.body as { lines: Record<string, unknown>[] }).lines[0];
    expect(line).toMatchObject({ productId: "p-charger", quantity: 10 });
    expect(line).not.toHaveProperty("lineTotalCents");
  });

  it("adds a row by typing part of a name", async () => {
    const { user } = openStockIn();
    await pickSupplier(user);
    await user.type(await screen.findByLabelText("Add a product"), "oraimo");
    await user.click(await screen.findByRole("button", { name: "Oraimo 20W Charger" }));
    expect(await findRow("Oraimo 20W Charger")).toBeTruthy();
    expect(screen.getByText("Oraimo 20W Charger added.")).toBeVisible();
  });

  it("converts a pack unit to pieces and sends the pack with the quantity", async () => {
    const { user, calls } = openStockIn({
      "GET /products/lookup?barcode=CABLE": productPage(boxed),
    });
    await pickSupplier(user);
    await scan(user, "cable");
    const row = await findRow("USB Cable");
    await user.selectOptions(row.getByLabelText("Unit"), "Box (10 pieces)");
    await user.clear(row.getByLabelText("Quantity"));
    await user.type(row.getByLabelText("Quantity"), "2");
    await user.type(row.getByLabelText("Amount"), "1000");
    expect(row.getByText(/50.00 per piece/)).toBeVisible();
    expect(screen.getByText("20 pieces", { exact: false })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    await screen.findByText("Delivery saved.");
    expect(postedDelivery(calls)[0]?.body).toMatchObject({
      lines: [{ productId: "p-boxed", packUnitId: "pk-box", quantity: 2, lineTotalCents: 100_000 }],
    });
  });

  it("explains an unknown barcode and offers to add the product", async () => {
    const { user } = openStockIn({ "GET /products/lookup?barcode=0000111122223": productPage() });
    await pickSupplier(user);
    await scan(user, "0000111122223");
    expect(await screen.findByText("No product has the barcode 0000111122223.")).toBeVisible();
    expect(screen.getByRole("link", { name: /Add this product/ })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("tells the person to add the phone first when an IMEI is scanned into the product box", async () => {
    const { user } = openStockIn({ [`GET /products/lookup?barcode=${IMEI_A}`]: productPage() });
    await pickSupplier(user);
    await scan(user, IMEI_A);
    expect(await screen.findByText(/This is an IMEI. Add the phone first/)).toBeVisible();
  });

  it("asks for a supplier, a product and a whole quantity before saving", async () => {
    const { user, calls } = openStockIn();
    await user.click(await screen.findByRole("button", { name: "Save delivery" }));
    expect(screen.getByText("Choose the supplier.")).toBeVisible();
    expect(screen.getByText("Add at least one product.")).toBeVisible();
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await findRow("Oraimo 20W Charger");
    await user.clear(row.getByLabelText("Quantity"));
    await user.type(row.getByLabelText("Quantity"), "0");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText("Enter a whole quantity of 1 or more.")).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
    await waitFor(() =>
      expect(within(rowOf("Oraimo 20W Charger")).getByLabelText("Quantity")).toBeVisible(),
    );
  });

  it("blocks suppliers paid in US dollars until dollar deliveries exist", async () => {
    const { user, calls } = openStockIn({
      "GET /suppliers": {
        body: {
          suppliers: [
            {
              id: "s9",
              name: "Dubai Gadgets",
              phone: "+971501234567",
              paymentRule: { type: "cash" },
              currency: "USD",
              status: "active",
              addedBy: { id: "u1", name: "Amina Hassan" },
              createdAt: "2026-11-02T09:00:00.000Z",
            },
          ],
          nextCursor: null,
        },
      },
    });
    await user.click(await screen.findByRole("button", { name: /Dubai Gadgets/ }));
    await scan(user, "6901234567890");
    await findRow("Oraimo 20W Charger");
    await user.click(screen.getByRole("button", { name: "Save delivery" }));
    expect(await screen.findByText(/Dollar deliveries are not available yet/)).toBeVisible();
    expect(postedDelivery(calls)).toHaveLength(0);
  });

  it("shows the sheet as a card per product with the wide grid classes for larger screens", async () => {
    const { user } = openStockIn();
    await pickSupplier(user);
    await scan(user, "6901234567890");
    const row = await screen.findByRole("group", { name: "Oraimo 20W Charger" });
    expect(row.className).toContain("md:grid");
    expect(row.className).toContain("flex-col");
  });
});
