import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

interface ConfirmPanelProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}

/** Inline "are you sure?" step: no pop-up, the question appears right where the person tapped. */
export function ConfirmPanel({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  danger = false,
}: ConfirmPanelProps) {
  const { t } = useTranslation();
  return (
    <div role="group" className="rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
      <p className="text-base font-semibold text-slate-900">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={onConfirm}>
          {busy ? t("common.working") : confirmLabel}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
