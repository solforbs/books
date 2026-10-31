import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/app-providers";
import { AppRoutes } from "@/app/app-routes";
import { createQueryClient } from "@/lib/query-client";

/** Renders the whole app at `path` with a fresh query cache, like a page load. */
export function renderApp(path = "/") {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
  const user = userEvent.setup();
  const view = render(
    <AppProviders client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...view, user, client };
}
