import { Building2, Store, Tags, Users, Wallet, type LucideIcon } from "lucide-react";
import type { Access } from "@/features/access/hooks/use-access";

export type SettingsEntryId = "business" | "locations" | "moneyPlaces" | "staff" | "categories";

export interface SettingsEntry {
  id: SettingsEntryId;
  path: string;
  icon: LucideIcon;
}

const ENTRIES: SettingsEntry[] = [
  { id: "business", path: "/settings/business", icon: Building2 },
  { id: "locations", path: "/settings/locations", icon: Store },
  { id: "moneyPlaces", path: "/settings/money-places", icon: Wallet },
  { id: "staff", path: "/settings/staff", icon: Users },
  { id: "categories", path: "/settings/categories", icon: Tags },
];

/** Who may open each Settings page; the API enforces the same rules. */
export function canOpen(id: SettingsEntryId, access: Access): boolean {
  switch (id) {
    case "business":
      return access.can("manage_business");
    case "locations":
    case "moneyPlaces":
      return access.can("manage_locations");
    case "staff":
      return access.isOwner || access.can("add_staff");
    case "categories":
      return access.can("manage_products");
  }
}

/** Only the entries this person can use, so there are no dead buttons. */
export function visibleSettingsEntries(access: Access): SettingsEntry[] {
  return ENTRIES.filter((entry) => canOpen(entry.id, access));
}
