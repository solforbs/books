import { cleanText, type Category, type Product, type UpdateProductRequest } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/features/auth/components/form-error";
import { formatDateTime } from "@/features/staff/format";
import { isApiError } from "@/lib/api";
import { useApproveProduct, useRejectProduct } from "../hooks/use-product-mutations";
import { useSeesPrices } from "../hooks/use-sees-prices";
import { moneyToInput, parseMoneyInput, showMoney } from "../money-input";
import { ApproveFixFields, type Fixes } from "./approve-fix-fields";
import { MergePanel } from "./merge-panel";

interface WaitingItemProps {
  product: Product;
  categories: Category[];
  canSetPrices: boolean;
}

type Mode = "idle" | "fix" | "merge" | "reject";

/** One product waiting for a decision: approve (maybe after fixing), merge, or reject. */
export function WaitingItem({ product, categories, canSetPrices }: WaitingItemProps) {
  const { t, i18n } = useTranslation();
  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const [mode, setMode] = useState<Mode>("idle");
  const seesPrices = useSeesPrices();
  const [badPrice, setBadPrice] = useState(false);
  const [fixes, setFixes] = useState<Fixes>({
    name: product.name,
    categoryId: product.categoryId,
    retail: moneyToInput(product.retailPrice),
  });

  const doApprove = () => {
    const body: UpdateProductRequest = {};
    if (mode === "fix") {
      const name = cleanText(fixes.name);
      if (name && name !== product.name) body.name = name;
      if (fixes.categoryId !== product.categoryId) body.categoryId = fixes.categoryId;
      const price = parseMoneyInput(fixes.retail);
      if (canSetPrices && !price.ok) return setBadPrice(true);
      if (canSetPrices && price.ok && price.value !== product.retailPrice)
        body.retailPrice = price.value;
    }
    setBadPrice(false);
    approve.mutate({ id: product.id, body });
  };

  const rejectInUse = isApiError(reject.error) && reject.error.code === "product_in_use";
  const busy = approve.isPending || reject.isPending;

  return (
    <Card className="flex flex-col gap-3 sm:p-5">
      <div>
        <h2 className="break-words font-heading text-xl font-bold">{product.name}</h2>
        <p className="text-sm text-slate-700">
          {t("catalog.waiting.addedBy", {
            name: product.addedBy.name,
            when: formatDateTime(product.createdAt, i18n.language),
          })}
          {seesPrices &&
            product.retailPrice !== null &&
            ` · ${t("catalog.price", { amount: showMoney(product.retailPrice) })}`}
        </p>
      </div>
      {mode === "fix" && (
        <ApproveFixFields
          fixes={fixes}
          onChange={setFixes}
          categories={categories}
          canSetPrices={canSetPrices}
        />
      )}
      {badPrice && <Alert variant="error">{t("validation.invalid_amount")}</Alert>}
      {mode === "merge" && <MergePanel product={product} onCancel={() => setMode("idle")} />}
      {mode === "reject" && (
        <ConfirmPanel
          danger
          message={t("catalog.waiting.rejectConfirm", { name: product.name })}
          confirmLabel={t("catalog.waiting.reject")}
          busy={reject.isPending}
          onCancel={() => setMode("idle")}
          onConfirm={() => reject.mutate(product.id)}
        />
      )}
      {mode !== "merge" && mode !== "reject" && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={doApprove}>
            {approve.isPending ? t("common.working") : t("catalog.waiting.approve")}
          </Button>
          {mode === "idle" && (
            <Button variant="secondary" onClick={() => setMode("fix")}>
              {t("catalog.waiting.fixFirst")}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMode("merge")}>
            {t("catalog.waiting.sameAs")}
          </Button>
          <Button variant="ghost" onClick={() => setMode("reject")}>
            {t("catalog.waiting.reject")}
          </Button>
        </div>
      )}
      {rejectInUse ? (
        <Alert variant="error">{t("catalog.waiting.rejectInUse")}</Alert>
      ) : (
        <FormError error={approve.error ?? reject.error} />
      )}
    </Card>
  );
}
