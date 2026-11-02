import { createLocationRequestSchema, type Location } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { useCreateLocation } from "../hooks/use-locations";

/** F02 §2.1 step 4: one question, then straight to the home screen. */
function FirstLocationForm() {
  const { t } = useTranslation();
  const create = useCreateLocation();
  const [name, setName] = useState("");
  const [type, setType] = useState<Location["type"]>("shop");
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createLocationRequestSchema.safeParse({ name, type });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    create.mutate(parsed.data);
  };

  return (
    <Card>
      <CardTitle>{t("setup.title")}</CardTitle>
      <CardDescription>{t("setup.intro")}</CardDescription>
      <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
        <FormField label={t("setup.name")} hint={t("setup.nameHint")} error={fieldError("name")}>
          {(a11y) => <Input {...a11y} value={name} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <ChoiceGroup
          legend={t("locations.type")}
          value={type}
          onChange={setType}
          choices={[
            { value: "shop", label: t("locations.types.shop") },
            { value: "store", label: t("locations.types.store") },
          ]}
        />
        <FormError error={create.error} />
        <Button type="submit" block disabled={create.isPending}>
          {create.isPending ? t("common.working") : t("setup.submit")}
        </Button>
      </form>
    </Card>
  );
}

/** Shown when the business has no open location yet: the owner sets one up, others wait. */
export function NoLocationPage({ isOwner }: { isOwner: boolean }) {
  const { t } = useTranslation();
  if (isOwner) return <FirstLocationForm />;
  return (
    <Card>
      <CardTitle>{t("setup.waitTitle")}</CardTitle>
      <CardDescription>{t("setup.waitBody")}</CardDescription>
    </Card>
  );
}
