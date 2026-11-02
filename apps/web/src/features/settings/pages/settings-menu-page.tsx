import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { useAccess } from "@/features/access/hooks/use-access";
import { visibleSettingsEntries } from "../settings-entries";

/** The Settings list: only the pages this person may use. */
export function SettingsMenuPage() {
  const { t } = useTranslation();
  const entries = visibleSettingsEntries(useAccess());
  if (entries.length === 0) return <Navigate to="/" replace />;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-slate-900">{t("settings.title")}</h1>
      <ul className="flex flex-col divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              to={entry.path}
              className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
            >
              <entry.icon aria-hidden className="h-6 w-6 shrink-0 text-brand-dark" />
              <span className="flex-1">
                <span className="block text-lg font-semibold text-slate-900">
                  {t(`settings.${entry.id}.title`)}
                </span>
                <span className="block text-sm text-slate-700">
                  {t(`settings.${entry.id}.hint`)}
                </span>
              </span>
              <ChevronRight aria-hidden className="h-5 w-5 text-slate-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
