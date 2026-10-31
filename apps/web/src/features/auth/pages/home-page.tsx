import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { InstallHint } from "@/components/install-hint";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "../components/logout-button";
import { useSession } from "../hooks/use-session";
import { activeBusinessName } from "../session-step";

/** Placeholder until the real dashboard (F12) is built. */
export function HomePage() {
  const { t } = useTranslation();
  const session = useSession().data;
  if (!session) return null;
  return (
    <AppShell actions={<LogoutButton />}>
      <Card>
        <CardTitle>{t("home.greeting", { name: session.user.name })}</CardTitle>
        <CardDescription className="text-lg font-semibold text-slate-900">
          {t("home.business", { name: activeBusinessName(session) ?? "" })}
        </CardDescription>
        <CardDescription>{t("home.placeholder")}</CardDescription>
      </Card>
      <InstallHint />
    </AppShell>
  );
}
