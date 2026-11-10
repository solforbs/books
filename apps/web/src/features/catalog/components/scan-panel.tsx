import { normalizeBarcode, type Product } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/access/hooks/use-access";
import { FormError } from "@/features/auth/components/form-error";
import { productsApi } from "../api/products-api";

type Outcome = { kind: "none"; code: string } | { kind: "several"; products: Product[] } | null;

/**
 * Scan or type a barcode. A keyboard-wedge scanner types the code and presses Enter, which
 * looks it up: one match opens the product, no match offers to add it. (Camera scanning
 * is a later slice.)
 */
export function ScanPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAccess();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeBarcode(text);
    if (!code) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const { products } = await productsApi.lookup(code);
      const [only] = products;
      if (products.length === 1 && only) navigate(`/products/${only.id}`);
      else if (products.length > 1) setOutcome({ kind: "several", products });
      else setOutcome({ kind: "none", code });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-slate-300 bg-white p-4">
      <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} noValidate>
        <FormField label={t("catalog.scan.label")} hint={t("catalog.scan.hint")}>
          {(a11y) => (
            <Input
              {...a11y}
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </FormField>
        <Button type="submit" className="w-fit" disabled={busy}>
          {busy ? t("common.working") : t("catalog.scan.find")}
        </Button>
      </form>
      <FormError error={error} />
      {outcome?.kind === "none" && (
        <Alert variant="info">
          <p>{t("catalog.scan.notFound", { code: outcome.code })}</p>
          {can("add_products") && (
            <Link
              to={`/products/new?barcode=${encodeURIComponent(outcome.code)}`}
              className="font-semibold text-brand-dark underline underline-offset-4"
            >
              {t("catalog.scan.addNew")}
            </Link>
          )}
        </Alert>
      )}
      {outcome?.kind === "several" && (
        <div>
          <p className="font-semibold">{t("catalog.scan.which")}</p>
          <ul className="mt-1 flex flex-col">
            {outcome.products.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/products/${p.id}`}
                  className="flex min-h-tap items-center font-semibold text-brand-dark underline underline-offset-4"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
