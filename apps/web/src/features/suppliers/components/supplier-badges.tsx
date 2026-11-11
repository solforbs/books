import type { Supplier } from "@books/shared";
import { useTranslation } from "react-i18next";

/** Small badges only where they matter: waiting and hidden. Active shows nothing. */
export function StatusBadge({ status }: { status: Supplier["status"] }) {
  const { t } = useTranslation();
  if (status === "active") return null;
  const tone = status === "waiting" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {t(`suppliers.status.${status}`)}
    </span>
  );
}

const pill = "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900";

export function CurrencyBadge({ currency }: { currency: Supplier["currency"] }) {
  return currency === "USD" ? <span className={pill}>USD</span> : null;
}

export function NeighbourBadge({ isNeighbour }: { isNeighbour: boolean }) {
  const { t } = useTranslation();
  return isNeighbour ? <span className={pill}>{t("suppliers.neighbour")}</span> : null;
}
