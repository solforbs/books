import type { Category } from "@books/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { expandRows, type BulkRowData } from "../bulk-rows";
import { useBulkSubmit } from "../hooks/use-bulk-submit";
import { BulkRow } from "./bulk-row";
import { CategoryPicker } from "./category-picker";
import { ChipInput } from "./chip-input";
import type { FormContextData } from "./form-api";
import { MoneyField } from "./money-field";
import { colourSuggestions, conditionSuggestions, storageSuggestions } from "./naming-fields";
import { SuggestInput } from "./suggest-input";

const MAX_ROWS = 100;

interface BulkFormProps {
  categories: Category[];
  data: FormContextData;
}

/** Create several at once: category, brand, model, then storages x colours x conditions. */
export function BulkForm({ categories, data }: BulkFormProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category | undefined>();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [storages, setStorages] = useState<string[]>([]);
  const [colours, setColours] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [samePrice, setSamePrice] = useState("");
  const bulk = useBulkSubmit(data);

  const rows = useMemo(
    () => expandRows({ brand, model, storages, colours, conditions }),
    [brand, model, storages, colours, conditions],
  );
  const toCreate = rows.filter(
    (r) => !unticked.has(r.key) && bulk.outcomes[r.key]?.kind !== "created",
  );
  const input = { category: category as Category, brand, model, prices };
  const send = (list: BulkRowData[], acknowledge: boolean) =>
    void bulk.submit(list, input, acknowledge);
  const ready = category && brand.trim() && model.trim() && rows.length > 0;
  const created = rows.filter((r) => bulk.outcomes[r.key]?.kind === "created").length;

  const tick = (key: string, on: boolean) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (on) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-5">
      <CategoryPicker
        categories={categories}
        value={category?.id ?? ""}
        onChange={setCategory}
        partsOnly
      />
      {category && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("catalog.form.brand")}>
              {(a11y) => (
                <SuggestInput
                  {...a11y}
                  options={data.options?.brands ?? []}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              )}
            </FormField>
            <FormField label={t("catalog.form.model")}>
              {(a11y) => (
                <SuggestInput
                  {...a11y}
                  options={(data.options?.models ?? []).map((m) => m.model)}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              )}
            </FormField>
          </div>
          <ChipInput
            label={t("catalog.form.storage")}
            values={storages}
            onChange={setStorages}
            suggestions={storageSuggestions(data.options)}
          />
          <ChipInput
            label={t("catalog.form.colour")}
            values={colours}
            onChange={setColours}
            suggestions={colourSuggestions(data.options)}
          />
          <ChipInput
            label={t("catalog.form.condition")}
            values={conditions}
            onChange={setConditions}
            suggestions={conditionSuggestions(data.options)}
          />
        </>
      )}

      {rows.length > 0 && (
        <section aria-label={t("catalog.bulk.listTitle")} className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-bold">
            {t("catalog.bulk.summary", {
              storages: storages.length,
              colours: colours.length,
              conditions: conditions.length,
              total: rows.length,
            })}
          </h2>
          {rows.length > MAX_ROWS && <Alert variant="error">{t("catalog.bulk.tooMany")}</Alert>}
          {data.canSetPrices && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <MoneyField
                  label={t("catalog.bulk.samePrice")}
                  value={samePrice}
                  onChange={setSamePrice}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setPrices(Object.fromEntries(rows.map((r) => [r.key, samePrice])))}
              >
                {t("catalog.bulk.apply")}
              </Button>
            </div>
          )}
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <BulkRow
                key={row.key}
                row={row}
                ticked={!unticked.has(row.key)}
                onTick={(on) => tick(row.key, on)}
                price={data.canSetPrices ? (prices[row.key] ?? "") : undefined}
                onPrice={(text) => setPrices((prev) => ({ ...prev, [row.key]: text }))}
                outcome={bulk.outcomes[row.key]}
                busy={bulk.pending}
                onCreateAnyway={() => send([row], true)}
              />
            ))}
          </ul>
        </section>
      )}

      <FormError error={bulk.error} />
      {created > 0 && (
        <Alert variant="success">{t("catalog.bulk.createdCount", { count: created })}</Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!ready || bulk.pending || toCreate.length === 0 || rows.length > MAX_ROWS}
          onClick={() => send(toCreate, false)}
        >
          {bulk.pending
            ? t("common.working")
            : t("catalog.bulk.create", { count: toCreate.length })}
        </Button>
        <Link
          to="/products"
          className="inline-flex min-h-tap items-center rounded-lg border-2 border-brand px-5 font-semibold text-brand-dark hover:bg-brand-light"
        >
          {created > 0 ? t("catalog.bulk.finish") : t("common.cancel")}
        </Link>
      </div>
    </div>
  );
}
