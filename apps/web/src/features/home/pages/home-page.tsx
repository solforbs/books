import { useTranslation } from "react-i18next";
import { InstallHint } from "@/components/install-hint";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useSession } from "@/features/auth/hooks/use-session";
import { activeBusinessName } from "@/features/auth/session-step";
import { useCurrentLocation } from "@/features/locations/hooks/current-location";

/** Placeholder until the real dashboard (F12) is built. */
export function HomePage() {
  const { t } = useTranslation();
  const session = useSession().data;
  const { current } = useCurrentLocation();
  if (!session) return null;
  return (
    <>
      <Card>
        <CardTitle>{t("home.greeting", { name: session.user.name })}</CardTitle>
        <CardDescription className="text-lg font-semibold text-slate-900">
          {t("home.business", { name: activeBusinessName(session) ?? "" })}
        </CardDescription>
        {current && (
          <CardDescription data-testid="current-location">
            {t("home.location", { name: current.name })}
          </CardDescription>
        )}
        <CardDescription>{t("home.placeholder")}</CardDescription>
      </Card>
      <InstallHint />
    </>
  );
}
