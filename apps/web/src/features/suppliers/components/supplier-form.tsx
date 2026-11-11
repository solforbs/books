import type { Supplier } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useSupplierSave } from "../hooks/use-supplier-save";
import type { Issues, SupplierFormValues } from "../supplier-form-values";
import { SupplierBlockPanel } from "./supplier-block-panel";
import { SupplierFields } from "./supplier-fields";

interface Props<TRequest> {
  initial: SupplierFormValues;
  submitLabel: string;
  build: (
    values: SupplierFormValues,
  ) => { ok: true; request: TRequest } | { ok: false; issues: Issues };
  save: (request: TRequest, acknowledgeSimilar: boolean) => Promise<Supplier>;
  onSaved: (supplier: Supplier) => void;
  onCancel: () => void;
  /** Shown above the buttons, for example the note that rule changes apply to new deliveries. */
  note?: string;
  anywayLabel?: string;
}

/** The supplier form used to add, edit and complete a supplier. */
export function SupplierForm<TRequest>(props: Props<TRequest>) {
  const { t } = useTranslation();
  const [values, setValues] = useState(props.initial);
  const [issues, setIssues] = useState<Issues>({});
  const flow = useSupplierSave<TRequest>({ save: props.save, onSaved: props.onSaved });

  const set = <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    flow.dismiss();
  };
  const error = (field: string) => (issues[field] ? t(issues[field]) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const built = props.build(values);
    if (!built.ok) return setIssues(built.issues);
    setIssues({});
    void flow.submit(built.request);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <SupplierFields values={values} set={set} error={error} />
      {props.note && <Alert variant="info">{props.note}</Alert>}
      {Object.keys(issues).length > 0 && (
        <Alert variant="error">{t("validation.check_field")}</Alert>
      )}
      {flow.block && (
        <SupplierBlockPanel
          block={flow.block}
          busy={flow.pending}
          onCreateAnyway={flow.createAnyway}
          onDismiss={flow.dismiss}
          {...(props.anywayLabel ? { anywayLabel: props.anywayLabel } : {})}
        />
      )}
      <FormError error={flow.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={flow.pending}>
          {flow.pending ? t("common.working") : props.submitLabel}
        </Button>
        <Button variant="secondary" onClick={props.onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
