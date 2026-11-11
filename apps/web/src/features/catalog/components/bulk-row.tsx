import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessageKey } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BulkRowData, RowOutcome } from "../bulk-rows";

interface BulkRowProps {
  row: BulkRowData;
  ticked: boolean;
  onTick: (on: boolean) => void;
  /** Undefined when the person may not set prices (no price box then). */
  price: string | undefined;
  onPrice: (text: string) => void;
  outcome: RowOutcome | undefined;
  busy: boolean;
  onCreateAnyway: () => void;
}

const linkClass = "font-semibold text-brand-dark underline underline-offset-4";

function OutcomeText({
  outcome,
  busy,
  onCreateAnyway,
}: Pick<BulkRowProps, "busy" | "onCreateAnyway"> & { outcome: RowOutcome }) {
  const { t } = useTranslation();
  switch (outcome.kind) {
    case "created":
      return (
        <p className="font-semibold text-green-800">
          {t("catalog.bulk.created")}{" "}
          <Link to={`/products/${outcome.product.id}`} className={linkClass}>
            {t("catalog.bulk.open")}
          </Link>
        </p>
      );
    case "duplicate":
      return (
        <p className="font-semibold text-red-800">
          {t("catalog.bulk.duplicate")}{" "}
          {outcome.productId && (
            <Link to={`/products/${outcome.productId}`} className={linkClass}>
              {t("catalog.block.openExisting")}
            </Link>
          )}
        </p>
      );
    case "similar":
      return (
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            {t("catalog.bulk.similar", { names: outcome.products.map((p) => p.name).join(", ") })}
          </p>
          <Button size="sm" className="mt-1" disabled={busy} onClick={onCreateAnyway}>
            {t("catalog.block.notTheSame")}
          </Button>
        </div>
      );
    case "needsPrice":
      return <p className="font-semibold text-red-800">{t("catalog.bulk.needsPrice")}</p>;
    case "invalid":
      return <p className="font-semibold text-red-800">{t("catalog.bulk.checkRow")}</p>;
    case "error":
      return (
        <p className="font-semibold text-red-800">
          {t(errorMessageKey(new ApiError(400, outcome.code, outcome.code)))}
        </p>
      );
  }
}

/** One product to be created: tick it, set its price, and later see what happened to it. */
export function BulkRow({
  row,
  ticked,
  onTick,
  price,
  onPrice,
  outcome,
  busy,
  onCreateAnyway,
}: BulkRowProps) {
  const { t } = useTranslation();
  const created = outcome?.kind === "created";
  const failed = outcome !== undefined && !created;
  return (
    <li
      data-state={created ? "created" : failed ? "failed" : "ready"}
      className={cn(
        "flex flex-col gap-2 rounded-lg border-2 p-3",
        failed
          ? "border-red-700 bg-red-50"
          : created
            ? "border-green-700 bg-green-50"
            : "border-slate-300",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-3 text-base font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 shrink-0 accent-brand"
            checked={ticked && !created}
            disabled={created}
            onChange={(e) => onTick(e.target.checked)}
          />
          <span className="break-words">{row.name}</span>
        </label>
        {price !== undefined && !created && (
          <div className="flex items-center gap-2">
            <span aria-hidden className="font-semibold text-slate-700">
              {t("catalog.currency")}
            </span>
            <Input
              inputMode="decimal"
              className="w-32"
              aria-label={t("catalog.bulk.priceFor", { name: row.name })}
              value={price}
              onChange={(e) => onPrice(e.target.value)}
            />
          </div>
        )}
      </div>
      {outcome && <OutcomeText outcome={outcome} busy={busy} onCreateAnyway={onCreateAnyway} />}
    </li>
  );
}
