import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apiError } from "@/test/mock-fetch";
import {
  IMEI_A,
  IMEI_B,
  deliveriesBody,
  deliveryBody,
  makeDelivery,
  storekeeperAccess,
} from "@/test/receiving-fixtures";
import { renderShop, shellReady } from "@/test/render-shop";
import { noSupplierAccess } from "@/test/supplier-fixtures";

const incompleteDelivery = makeDelivery({
  incompleteUnits: 2,
  lines: [
    {
      id: "dl2",
      product: { id: "p-iphone", name: "iPhone 13 Pro 128GB Blue New", trackingType: "imei" },
      packUnit: null,
      quantity: 3,
      pieces: 3,
      lineTotalCents: 28_500_000,
      costState: "known",
      units: [{ id: "u1", imei: IMEI_A, imei2: null, serial: null, status: "in_stock" }],
      missingUnits: 2,
    },
  ],
});

const pendingDelivery = makeDelivery({
  pendingCostLines: 1,
  knownTotalCents: 0,
  owedCents: 0,
  lines: [
    {
      id: "dl9",
      product: { id: "p-charger", name: "Oraimo 20W Charger", trackingType: "quantity" },
      packUnit: null,
      quantity: 10,
      pieces: 10,
      lineTotalCents: null,
      costState: "pending",
      units: [],
      missingUnits: 0,
    },
  ],
});

describe("Deliveries list", () => {
  it("lists deliveries with what is owed and what needs attention", async () => {
    renderShop("/receiving", {
      "GET /deliveries": deliveriesBody([incompleteDelivery, { ...pendingDelivery, id: "d2" }]),
    });
    const list = await screen.findByRole("list", { name: "Deliveries" });
    expect(within(list).getAllByText(/Eastleigh Phones Ltd/)).toHaveLength(2);
    expect(within(list).getAllByText("Owed KES 307,500").length).toBeGreaterThan(0);
    expect(within(list).getByText("IMEIs missing")).toBeVisible();
    expect(within(list).getByText("Cost to be added")).toBeVisible();
  });

  it("says so when there are no deliveries and offers Stock in", async () => {
    renderShop("/receiving", { "GET /deliveries": deliveriesBody([]) });
    expect(await screen.findByText("No deliveries yet.")).toBeVisible();
    const links = screen.getAllByRole("link", { name: "Stock in" });
    expect(links.some((l) => l.getAttribute("href") === "/receiving/new")).toBe(true);
  });

  it("hides money from people who cannot see costs", async () => {
    renderShop(
      "/receiving",
      {
        "GET /deliveries": deliveriesBody([
          makeDelivery({ knownTotalCents: null, paidCents: null, owedCents: null, dueDate: null }),
        ]),
      },
      storekeeperAccess,
    );
    await screen.findByRole("list", { name: "Deliveries" });
    expect(screen.queryByText(/Owed KES/)).not.toBeInTheDocument();
    expect(screen.queryByText("KES 307,500")).not.toBeInTheDocument();
  });

  it("sends people without receive_stock back home and hides the menu entries", async () => {
    renderShop("/receiving", {}, noSupplierAccess);
    await shellReady();
    expect(screen.queryByRole("heading", { name: "Deliveries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Stock in/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Stock$/ })).not.toBeInTheDocument();
  });

  it("shows the Stock in and Stock menu entries to people who receive stock", async () => {
    renderShop("/", {}, storekeeperAccess);
    await shellReady();
    expect((await screen.findAllByRole("link", { name: /Stock in/ })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^Stock$/ }).length).toBeGreaterThan(0);
  });
});

describe("One delivery", () => {
  it("shows what arrived, costs, paid, owed, the rule and the due date", async () => {
    renderShop("/receiving/d1", { "GET /deliveries/d1": deliveryBody(makeDelivery()) });
    expect(await screen.findByRole("heading", { name: "Delivery 1" })).toBeVisible();
    expect(screen.getByText("Pay within 1 month")).toBeVisible();
    expect(screen.getByText("Still owed").nextSibling).toHaveTextContent("KES 307,500");
    expect(screen.getByText("Paid").nextSibling).toHaveTextContent("KES 0");
    expect(screen.getByText("Due date")).toBeVisible();
    const phones = screen.getByRole("listitem", { name: "iPhone 13 Pro 128GB Blue New" });
    expect(within(phones).getByText("KES 285,000")).toBeVisible();
    expect(within(phones).getAllByText(/In stock/)).toHaveLength(3);
  });

  it("shows a cost to be added instead of money for people who cannot see costs", async () => {
    renderShop(
      "/receiving/d1",
      {
        "GET /deliveries/d1": deliveryBody(
          makeDelivery({
            knownTotalCents: null,
            paidCents: null,
            owedCents: null,
            dueDate: null,
            pendingCostLines: 1,
            lines: pendingDelivery.lines.map((l) => ({ ...l, lineTotalCents: null })),
          }),
        ),
      },
      storekeeperAccess,
    );
    await screen.findByRole("heading", { name: "Delivery 1" });
    expect(screen.queryByText("Still owed")).not.toBeInTheDocument();
    expect(screen.getAllByText("Cost to be added").length).toBeGreaterThan(0);
    // The form for entering costs needs see_cost_profit.
    expect(
      screen.queryByRole("heading", { name: "Add the missing costs" }),
    ).not.toBeInTheDocument();
  });

  it("T9: completes the missing IMEIs and sends them with the line", async () => {
    const { user, calls } = renderShop("/receiving/d1", {
      "GET /deliveries/d1": deliveryBody(incompleteDelivery),
      "POST /deliveries/d1/units": deliveryBody(makeDelivery()),
    });
    expect(await screen.findByText("2 IMEIs or serial numbers are still missing.")).toBeVisible();
    await user.click(screen.getByLabelText("Or paste a list, one per line"));
    await user.paste(`${IMEI_B}\n352099001761481`);
    await user.click(screen.getByRole("button", { name: "Save numbers" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/deliveries/d1/units")).toBeDefined());
    const post = calls.find((c) => c.path === "/deliveries/d1/units");
    expect(post?.body).toMatchObject({
      confirmSoldBefore: false,
      units: [
        { lineId: "dl2", imei: IMEI_B },
        { lineId: "dl2", imei: "352099001761481" },
      ],
    });
  });

  it("does not accept a number that is already on the delivery", async () => {
    const { user, calls } = renderShop("/receiving/d1", {
      "GET /deliveries/d1": deliveryBody(incompleteDelivery),
    });
    await screen.findByText("2 IMEIs or serial numbers are still missing.");
    await user.click(screen.getByLabelText("Or paste a list, one per line"));
    await user.paste(IMEI_A);
    await user.click(screen.getByRole("button", { name: "Save numbers" }));
    expect(await screen.findByText("Fix the numbers shown in red first.")).toBeVisible();
    expect(calls.find((c) => c.path === "/deliveries/d1/units")).toBeUndefined();
  });

  it("T7: enters the missing cost and sends the line total in cents", async () => {
    const { user, calls } = renderShop("/receiving/d1", {
      "GET /deliveries/d1": deliveryBody(pendingDelivery),
      "POST /deliveries/d1/costs": deliveryBody(makeDelivery()),
    });
    await screen.findByRole("heading", { name: "Add the missing costs" });
    await user.type(screen.getByLabelText("Line total for Oraimo 20W Charger"), "3000");
    await user.click(screen.getByRole("button", { name: "Save costs" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/deliveries/d1/costs")).toBeDefined());
    const post = calls.find((c) => c.path === "/deliveries/d1/costs");
    expect(post?.body).toMatchObject({ lines: [{ lineId: "dl9", lineTotalCents: 300_000 }] });
  });

  it("asks for at least one cost and refuses a wrong amount", async () => {
    const { user, calls } = renderShop("/receiving/d1", {
      "GET /deliveries/d1": deliveryBody(pendingDelivery),
    });
    await screen.findByRole("heading", { name: "Add the missing costs" });
    await user.click(screen.getByRole("button", { name: "Save costs" }));
    expect(await screen.findByText("Enter at least one cost.")).toBeVisible();
    await user.type(screen.getByLabelText("Line total for Oraimo 20W Charger"), "abc");
    await user.click(screen.getByRole("button", { name: "Save costs" }));
    expect(await screen.findByText(/Enter an amount above 0/)).toBeVisible();
    expect(calls.find((c) => c.path === "/deliveries/d1/costs")).toBeUndefined();
  });

  it("shows a clear message when the cost was already entered", async () => {
    const { user } = renderShop("/receiving/d1", {
      "GET /deliveries/d1": deliveryBody(pendingDelivery),
      "POST /deliveries/d1/costs": apiError(409, "cost_already_known"),
    });
    await screen.findByRole("heading", { name: "Add the missing costs" });
    await user.type(screen.getByLabelText("Line total for Oraimo 20W Charger"), "3000");
    await user.click(screen.getByRole("button", { name: "Save costs" }));
    expect(await screen.findByText("The cost of this line was already entered.")).toBeVisible();
  });

  it("says when the delivery does not exist", async () => {
    renderShop("/receiving/nope", { "GET /deliveries/nope": apiError(404, "delivery_not_found") });
    expect(await screen.findByText("This delivery was not found.")).toBeVisible();
  });
});
