import type { MyAccessResponse } from "@books/shared";
import { screen } from "@testing-library/react";
import { makeSession } from "./fixtures";
import { mockFetch, type Routes } from "./mock-fetch";
import { renderApp } from "./render-app";

/** Logs a person into "Luthuli Phones" with the given access and opens `path`. */
export function renderShop(path: string, routes: Routes = {}, access?: MyAccessResponse) {
  const api = mockFetch({
    "GET /auth/me": { body: makeSession() },
    ...(access ? { "GET /me/permissions": { body: access } } : {}),
    ...routes,
  });
  return { ...renderApp(path), ...api };
}

/** Waits until the logged-in shell has loaded (the business name is in the top bar). */
export async function shellReady() {
  await screen.findByTestId("business-name");
}
