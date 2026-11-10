import type { Location, MyAccessResponse } from "@books/shared";

/**
 * Open locations this person works at. The server already filters, but non-owners are also
 * limited to their assigned locations here so a stale cache can never offer someone else's shop.
 */
export function workLocations(locations: Location[], access: MyAccessResponse): Location[] {
  return locations.filter(
    (l) => l.status === "open" && (access.role === "owner" || access.locationIds.includes(l.id)),
  );
}

/** Open first (in the server's order), closed ones after. */
export function openFirst(locations: Location[]): { open: Location[]; closed: Location[] } {
  return {
    open: locations.filter((l) => l.status === "open"),
    closed: locations.filter((l) => l.status === "closed"),
  };
}
