import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "../components/form-error";
import { LogoutButton } from "../components/logout-button";
import { useSelectBusiness } from "../hooks/use-auth-mutations";
import { useSession } from "../hooks/use-session";

/** Shown after login to people who work in several businesses. One tap opens a business. */
export function ChooseBusinessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const memberships = useSession().data?.memberships ?? [];
  const select = useSelectBusiness();
  const choose = (tenantId: string) =>
    select.mutate({ tenantId }, { onSuccess: () => navigate("/", { replace: true }) });

  // With only one business there is nothing to choose, so open it without asking (G2).
  const only = memberships.length === 1 ? memberships[0]?.tenantId : undefined;
  const { mutate, isIdle } = select;
  useEffect(() => {
    if (only && isIdle) mutate({ tenantId: only });
  }, [only, isIdle, mutate]);

  return (
    <AppShell actions={<LogoutButton />}>
      <Card>
        <CardTitle>{t("business.title")}</CardTitle>
        <CardDescription>{t("business.intro")}</CardDescription>
        <ul className="mt-5 flex flex-col gap-3">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <Button
                variant="secondary"
                block
                className="min-h-16 flex-col items-start text-left"
                disabled={select.isPending}
                onClick={() => choose(m.tenantId)}
              >
                <span className="text-lg">{m.businessName}</span>
                <span className="text-sm font-normal text-slate-700">{t(`role.${m.role}`)}</span>
              </Button>
            </li>
          ))}
        </ul>
        {select.isPending && (
          <p role="status" className="mt-3 text-base text-slate-700">
            {t("business.selecting")}
          </p>
        )}
        <div className="mt-3">
          <FormError error={select.error} />
        </div>
      </Card>
    </AppShell>
  );
}
