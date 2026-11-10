import { ChevronDown, ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Rare options stay folded away behind "More" (G2). */
export function MoreSection({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-tap items-center gap-1 font-semibold text-brand-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon aria-hidden className="h-5 w-5" />
        {label ?? t("common.more")}
      </button>
      {open && (
        <div id={id} className="mt-2 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  );
}
