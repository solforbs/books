import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { expect } from "vitest";
import type { RecordedCall, Routes } from "@/test/mock-fetch";
import { deliveryBody, makeDelivery, stockInRoutes } from "@/test/receiving-fixtures";
import { renderShop } from "@/test/render-shop";
import type { MyAccessResponse } from "@books/shared";

/** The routes every stock-in test needs, plus a successful save and the page it opens. */
export function openStockIn(routes: Routes = {}, access?: MyAccessResponse) {
  return renderShop(
    "/receiving/new",
    {
      ...stockInRoutes(),
      "POST /deliveries": { status: 201, body: deliveryBody(makeDelivery()).body },
      "GET /deliveries/d1": deliveryBody(makeDelivery()),
      ...routes,
    },
    access,
  );
}

export async function pickSupplier(user: UserEvent) {
  await user.click(await screen.findByRole("button", { name: /Eastleigh Phones Ltd/ }));
}

/** A scanner types the code and presses Enter. */
export async function scan(user: UserEvent, code: string) {
  await user.type(await screen.findByLabelText("Add a product"), `${code}{Enter}`);
}

export const rowOf = (name: string) => screen.getByRole("group", { name });

/** Waits for a product row and returns it. */
export async function findRow(name: string) {
  return within(await screen.findByRole("group", { name }));
}

export async function expectQuantity(name: string, quantity: string) {
  await waitFor(() => expect(within(rowOf(name)).getByLabelText("Quantity")).toHaveValue(quantity));
}

export function postedDelivery(calls: RecordedCall[]) {
  return calls.filter((c) => c.method === "POST" && c.path === "/deliveries");
}

export async function pasteInto(user: UserEvent, label: string, text: string) {
  await user.click(screen.getByLabelText(label));
  await user.paste(text);
}
