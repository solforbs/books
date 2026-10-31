import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "./language-switch";

/** Page frame for every screen: brand bar with the language switch, centred content column. */
export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="font-heading text-xl font-bold text-brand-dark">{t("app.name")}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            {actions}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
