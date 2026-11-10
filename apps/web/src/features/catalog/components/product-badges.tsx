import type { Product } from "@books/shared";
import { useTranslation } from "react-i18next";

/** Small badges only where they matter: waiting and hidden products. Active shows nothing. */
export function StatusBadge({ status }: { status: Product["status"] }) {
  const { t } = useTranslation();
  if (status === "active") return null;
  const tone = status === "waiting" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {t(`catalog.status.${status}`)}
    </span>
  );
}
