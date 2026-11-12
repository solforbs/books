import { isValidImei, normalizeBarcode, type Product } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/access/hooks/use-access";
import { FormError } from "@/features/auth/components/form-error";
import { productsApi } from "@/features/catalog/api/products-api";
import { useDebounced } from "@/features/catalog/hooks/use-debounced";
import { useProductSearch } from "@/features/catalog/hooks/use-products";

type Outcome =
  | { kind: "added"; name: string }
  | { kind: "none"; code: string }
  | { kind: "imei" }
  | { kind: "several"; products: Product[] }
  | null;

/**
 * "Scan or type to add a row" (F04 section 2). A scanner types the code and presses Enter,
 * which looks the barcode up; typing part of a name shows matches to tap. Adding a product
 * that already has a row adds 1 to it (see sheet-state).
 */
export function ProductAdder({ onAdd }: { onAdd: (product: Product) => void }) {
  const { t } = useTranslation();
  const { can } = useAccess();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const q = useDebounced(text.trim());
  const found = useProductSearch(q).data;
  const matches = text.trim() === "" ? [] : (found ?? []);

  const add = (product: Product) => {
    onAdd(product);
    setText("");
    setOutcome({ kind: "added", name: product.name });
  };

  const scan = async () => {
    const code = normalizeBarcode(text);
    if (!code) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const { products } = await productsApi.lookup(code);
      const [only] = products;
      if (products.length === 1 && only) add(only);
      else if (products.length > 1) setOutcome({ kind: "several", products });
      // An IMEI belongs to a phone that is added first; it is entered on that phone's row.
      else setOutcome(isValidImei(code) ? { kind: "imei" } : { kind: "none", code });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const choices = outcome?.kind === "several" ? outcome.products : matches;
  return (
    <div className="flex flex-col gap-2">
      <FormField label={t("receiving.add.label")} hint={t("receiving.add.hint")}>
        {(a11y) => (
          <Input
            {...a11y}
            autoComplete="off"
            disabled={busy}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOutcome(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              void scan();
            }}
          />
        )}
      </FormField>
      <FormError error={error} />
      {outcome?.kind === "added" && (
        <Alert variant="success">{t("receiving.add.added", { name: outcome.name })}</Alert>
      )}
      {outcome?.kind === "imei" && <Alert variant="info">{t("receiving.add.imeiFirst")}</Alert>}
      {outcome?.kind === "none" && (
        <Alert variant="info">
          <p>{t("receiving.add.notFound", { code: outcome.code })}</p>
          {can("add_products") && (
            <a
              href={`/products/new?barcode=${encodeURIComponent(outcome.code)}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-dark underline underline-offset-4"
            >
              {t("receiving.add.addProduct")}
            </a>
          )}
        </Alert>
      )}
      {choices.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {choices.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="min-h-tap w-full px-3 py-2 text-left font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => add(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
