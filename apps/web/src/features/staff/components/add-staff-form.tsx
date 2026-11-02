import { createStaffRequestSchema, type CreateStaffResponse, type Role } from "@books/shared";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/access/hooks/use-access";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { blankToUndefined } from "@/features/auth/validation";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { useCreateStaff } from "../hooks/use-staff";
import { assignableLocations, assignableRoles } from "../staff-scope";
import { RoleLocationFields } from "./role-location-fields";

/** Name -> phone and/or email -> role -> locations -> Save (F02 §2.3). */
export function AddStaffForm({ onCreated }: { onCreated: (result: CreateStaffResponse) => void }) {
  const { t } = useTranslation();
  const access = useAccess();
  const create = useCreateStaff();
  const openLocations = (useLocations().data ?? []).filter((l) => l.status === "open");
  const roles = assignableRoles(access);
  const locations = assignableLocations(access, openLocations);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles.includes("cashier") ? "cashier" : "storekeeper");
  // With one possible location it is ticked already (G2). Locations load after the
  // first render, so tick it once they arrive unless the person has chosen already.
  const onlyLocationId = locations.length === 1 ? locations[0]?.id : undefined;
  const [locationIds, setLocationIds] = useState<string[]>(onlyLocationId ? [onlyLocationId] : []);
  const [touchedLocations, setTouchedLocations] = useState(false);
  useEffect(() => {
    if (onlyLocationId && !touchedLocations) setLocationIds([onlyLocationId]);
  }, [onlyLocationId, touchedLocations]);
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createStaffRequestSchema.safeParse({
      name,
      phone: blankToUndefined(phone),
      email: blankToUndefined(email),
      role,
      locationIds: role === "owner" ? [] : locationIds,
    });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    create.mutate(parsed.data, { onSuccess: onCreated });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <FormField label={t("staff.name")} error={fieldError("name")}>
        {(a11y) => <Input {...a11y} value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      <FormField label={t("staff.phone")} hint={t("staff.contactHint")} error={fieldError("phone")}>
        {(a11y) => (
          <Input
            {...a11y}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
      </FormField>
      <FormField label={t("staff.email")} error={fieldError("email")}>
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </FormField>
      <RoleLocationFields
        roles={roles}
        locations={locations}
        role={role}
        locationIds={locationIds}
        onRoleChange={setRole}
        onLocationsChange={(ids) => {
          setTouchedLocations(true);
          setLocationIds(ids);
        }}
        locationError={fieldError("locationIds")}
      />
      <FormError error={create.error} />
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? t("common.working") : t("common.save")}
      </Button>
    </form>
  );
}
