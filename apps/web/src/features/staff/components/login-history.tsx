import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "../format";
import { useLoginHistory } from "../hooks/use-staff";

/** Owner only. Loaded when opened, since most visits to a person do not need it. */
export function LoginHistory({ membershipId }: { membershipId: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const history = useLoginHistory(membershipId, open);

  if (!open) {
    return (
      <Button variant="secondary" className="w-fit" onClick={() => setOpen(true)}>
        {t("staff.history.show")}
      </Button>
    );
  }
  if (history.error) {
    return <LoadError error={history.error} onRetry={() => void history.refetch()} />;
  }
  if (!history.data) return <LoadingText />;
  if (history.data.length === 0) {
    return <p className="text-base text-slate-700">{t("staff.history.empty")}</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
      {history.data.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="flex flex-wrap justify-between gap-2 p-3">
          <span className="font-semibold text-slate-900">
            {formatDateTime(entry.at, i18n.language)}
          </span>
          <span className={entry.outcome === "success" ? "text-green-800" : "text-red-800"}>
            {t(`staff.history.outcome.${entry.outcome}`)}
          </span>
          {entry.device && <span className="w-full text-sm text-slate-700">{entry.device}</span>}
        </li>
      ))}
    </ul>
  );
}
