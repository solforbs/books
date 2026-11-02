import type { Location, StaffMember } from "@books/shared";
import type { TFunction } from "i18next";

/** Date and time in the person's language, e.g. for last login and login history. */
export function formatDateTime(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(language, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return date.toLocaleString();
  }
}

/** "All locations" for owners, otherwise the names of their locations. */
export function memberLocationNames(member: StaffMember, locations: Location[], t: TFunction) {
  if (member.role === "owner") return t("staff.allLocations");
  return member.locationIds
    .map((id) => locations.find((l) => l.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

export function lastLoginText(member: StaffMember, language: string, t: TFunction) {
  return member.lastLoginAt
    ? t("staff.lastLogin", { when: formatDateTime(member.lastLoginAt, language) })
    : t("staff.neverLoggedIn");
}
