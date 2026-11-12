import {
  formatShillings,
  type Cents,
  type MoneyPlace,
  type PaymentRule,
  type Supplier,
} from "@books/shared";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { Alert } from "@/components/ui/alert";
import { moneyToInput } from "@/features/catalog/money-input";
import type { SheetTotals } from "../build-delivery-request";
import type { PayMode, PaymentDraft } from "../payment-draft";
import { PaymentRows } from "./payment-rows";
import { RuleOverride } from "./rule-override";

interface Props {
  supplier: Supplier;
  totals: SheetTotals;
  places: MoneyPlace[];
  draft: PaymentDraft;
  onDraft: (draft: PaymentDraft) => void;
  onRule: (rule: PaymentRule | "invalid" | null) => void;
}

/**
 * Step 4 (F04 section 3): credit, part paid or paid in full, each from one or more money
 * places. Only people who may pay suppliers and see costs get this step at all.
 */
export function PaymentStep({ supplier, totals, places, draft, onDraft, onRule }: Props) {
  const { t } = useTranslation();
  const known = totals.knownTotalCents;
  const setMode = (mode: PayMode) => {
    if (mode === "credit") return onDraft({ mode, rows: [] });
    const first = draft.rows[0] ?? { key: "pay-0", moneyPlaceId: places[0]?.id ?? "", amount: "" };
    // "Paid in full" starts with the whole known cost in the first place; it can be split.
    const amount = mode === "full" ? moneyToInput(known) : first.amount;
    onDraft({ mode, rows: [{ ...first, amount }] });
  };
  return (
    <section aria-label={t("receiving.pay.title")} className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold text-slate-900">{t("receiving.pay.title")}</h2>
      <ChoiceGroup
        legend={t("receiving.pay.how")}
        value={draft.mode}
        onChange={setMode}
        choices={[
          { value: "credit", label: t("receiving.pay.credit") },
          { value: "part", label: t("receiving.pay.part") },
          { value: "full", label: t("receiving.pay.full") },
        ]}
      />
      {totals.pendingLines > 0 && (
        <Alert variant="info">
          {t("receiving.pay.pendingNote", { count: totals.pendingLines })}
        </Alert>
      )}
      {draft.mode !== "credit" && (
        <PaymentRows
          rows={draft.rows}
          places={places}
          onChange={(rows) => onDraft({ ...draft, rows })}
        />
      )}
      {draft.mode !== "full" && (
        <>
          <p className="text-slate-800">
            {t("receiving.pay.owedRule", {
              amount: formatShillings(known as Cents, { decimals: false }),
            })}
          </p>
          <RuleOverride key={supplier.id} supplier={supplier} onChange={onRule} />
        </>
      )}
    </section>
  );
}
