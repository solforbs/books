import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SupplierBlock } from "../hooks/use-supplier-save";

interface Props {
  block: SupplierBlock;
  busy: boolean;
  onCreateAnyway: () => void;
  onDismiss: () => void;
  /** Label of the "not the same" button; adding says "create", completing says "save". */
  anywayLabel?: string;
}

const linkClass = "font-semibold text-brand-dark underline underline-offset-4";

/** Explains why a save was stopped: the phone is taken, or the name looks like another one. */
export function SupplierBlockPanel({ block, busy, onCreateAnyway, onDismiss, anywayLabel }: Props) {
  const { t } = useTranslation();

  if (block.kind === "phone") {
    return (
      <Alert variant="error">
        <p className="font-semibold">{t("suppliers.block.phoneTitle")}</p>
        {block.existingName && <p>{block.existingName}</p>}
        <Link to={`/suppliers/${block.existingId}`} className={linkClass}>
          {t("suppliers.block.openExisting")}
        </Link>
      </Alert>
    );
  }

  return (
    <Alert variant="info">
      <p className="font-semibold">{t("suppliers.block.similarTitle")}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {block.suppliers.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{s.name}</span>
            <Link to={`/suppliers/${s.id}`} className={linkClass}>
              {t("suppliers.block.openExisting")}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={onCreateAnyway}>
          {busy ? t("common.working") : (anywayLabel ?? t("suppliers.block.createAnyway"))}
        </Button>
        <Button variant="secondary" onClick={onDismiss}>
          {t("suppliers.block.changeName")}
        </Button>
      </div>
    </Alert>
  );
}
