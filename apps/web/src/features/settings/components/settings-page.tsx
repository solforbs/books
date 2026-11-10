import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

interface SettingsPageProps {
  title: string;
  intro?: string;
  /** Where the back link goes; Settings by default. */
  backTo?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Common frame for every Settings screen: back link, heading, optional main action. */
export function SettingsPage({
  title,
  intro,
  backTo = "/settings",
  action,
  children,
}: SettingsPageProps) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-4">
      <Link
        to={backTo}
        className="flex min-h-tap w-fit items-center gap-1 font-semibold text-brand-dark underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-5 w-5" />
        {t("common.back")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">{title}</h1>
          {intro && <p className="mt-1 text-base text-slate-700">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
