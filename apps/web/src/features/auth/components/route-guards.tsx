import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FormError } from "./form-error";
import { useSession } from "../hooks/use-session";
import { nextStep, STEP_PATHS, type SessionStep } from "../session-step";

function Loading() {
  const { t } = useTranslation();
  return (
    <p role="status" className="p-8 text-center text-lg text-slate-700">
      {t("app.loading")}
    </p>
  );
}

/**
 * Lets a logged-in person through only when this page is their next step; otherwise sends
 * them where they belong (log in, set own password, choose business, or home).
 */
export function RequireSession({ step, children }: { step: SessionStep; children: ReactNode }) {
  const { t } = useTranslation();
  const { data: session, isPending, isFetching, error, refetch } = useSession();
  const location = useLocation();
  if (isPending && !error) return <Loading />;
  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <FormError error={error} />
        <Button disabled={isFetching} onClick={() => void refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const required = nextStep(session);
  if (required !== step) return <Navigate to={STEP_PATHS[required]} replace />;
  return <>{children}</>;
}

/**
 * Login, sign-up and recovery pages: someone already logged in goes straight in. If the
 * session check fails (server unreachable), the page still shows; the form reports errors.
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();
  if (isPending && !error) return <Loading />;
  if (session) return <Navigate to={STEP_PATHS[nextStep(session)]} replace />;
  return <>{children}</>;
}
