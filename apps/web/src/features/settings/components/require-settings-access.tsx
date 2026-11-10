import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAccess } from "@/features/access/hooks/use-access";
import { canOpen, type SettingsEntryId } from "../settings-entries";

/** Opening a Settings page by its address without the permission just goes back to Settings. */
export function RequireSettingsAccess({
  entry,
  children,
}: {
  entry: SettingsEntryId;
  children: ReactNode;
}) {
  const access = useAccess();
  if (!canOpen(entry, access)) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}
