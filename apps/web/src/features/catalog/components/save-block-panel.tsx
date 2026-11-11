import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SaveBlock } from "../hooks/use-save-flow";

interface SaveBlockPanelProps {
  block: SaveBlock;
  busy: boolean;
  onCreateAnyway: () => void;
  onDismiss: () => void;
}

const linkClass = "font-semibold text-brand-dark underline underline-offset-4";

/** Explains why a save was stopped (F01 §9): duplicate, barcode clash, or similar products. */
export function SaveBlockPanel({ block, busy, onCreateAnyway, onDismiss }: SaveBlockPanelProps) {
  const { t } = useTranslation();

  if (block.kind === "duplicate") {
    return (
      <Alert variant="error">
        <p className="font-semibold">{t("catalog.block.duplicateTitle")}</p>
        {block.name && <p>{block.name}</p>}
        <Link to={`/products/${block.productId}`} className={linkClass}>
          {t("catalog.block.openExisting")}
        </Link>
      </Alert>
    );
  }

  if (block.kind === "barcode") {
    return (
      <Alert variant="error">
        <p className="font-semibold">{t("catalog.block.barcodeTitle")}</p>
        <ul className="mt-1 flex flex-col gap-1">
          {block.clashes.map((clash) => (
            <li key={`${clash.barcode}-${clash.productId}`}>
              {clash.name
                ? t("catalog.block.barcodeBelongsTo", { barcode: clash.barcode, name: clash.name })
                : t("catalog.block.barcodeBelongsToOther", { barcode: clash.barcode })}{" "}
              <Link to={`/products/${clash.productId}`} className={linkClass}>
                {t("catalog.block.openExisting")}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2">{t("catalog.block.barcodeHelp")}</p>
      </Alert>
    );
  }

  return (
    <Alert variant="info">
      <p className="font-semibold">{t("catalog.block.similarTitle")}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {block.products.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{product.name}</span>
            <Link to={`/products/${product.id}`} className={linkClass}>
              {t("catalog.block.useThisOne")}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={onCreateAnyway}>
          {busy ? t("common.working") : t("catalog.block.notTheSame")}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onDismiss}>
          {t("common.cancel")}
        </Button>
      </div>
    </Alert>
  );
}
