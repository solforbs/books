import type { Permission } from "@books/shared";
import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAccess } from "../hooks/use-access";

/**
 * Opening a page by its address without any of the given permissions goes back to Home (no
 * dead pages). Nothing is allowed until the person's access has loaded.
 */
export function RequireAnyPermission({
  any,
  children,
}: {
  any: Permission[];
  children: ReactNode;
}) {
  const { can, data } = useAccess();
  if (!data) return null;
  if (any.some((permission) => can(permission))) return <>{children}</>;
  return <Navigate to="/" replace />;
}
