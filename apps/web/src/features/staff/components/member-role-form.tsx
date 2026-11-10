import { ROLES, updateStaffRequestSchema, type Role, type StaffMember } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { useUpdateStaff } from "../hooks/use-staff";
import { RoleLocationFields } from "./role-location-fields";

/** Owner only: change someone's role and locations. */
export function MemberRoleForm({ member }: { member: StaffMember }) {
  const { t } = useTranslation();
  const update = useUpdateStaff();
  const openLocations = (useLocations().data ?? []).filter((l) => l.status === "open");
  const [role, setRole] = useState<Role>(member.role);
  const [locationIds, setLocationIds] = useState(member.locationIds);
  const { fieldError, showIssues, clear } = useFieldErrors();
  const changed =
    role !== member.role ||
    locationIds.length !== member.locationIds.length ||
    locationIds.some((id) => !member.locationIds.includes(id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.reset();
    if (role !== "owner" && locationIds.length === 0) {
      return showIssues([{ path: ["locationIds"], message: "location_required", code: "custom" }]);
    }
    const parsed = updateStaffRequestSchema.safeParse({
      role,
      locationIds: role === "owner" ? [] : locationIds,
    });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    update.mutate({ id: member.membershipId, body: parsed.data });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <RoleLocationFields
        roles={ROLES}
        locations={openLocations}
        role={role}
        locationIds={locationIds}
        onRoleChange={setRole}
        onLocationsChange={setLocationIds}
        locationError={fieldError("locationIds")}
      />
      <FormError error={update.error} />
      {update.isSuccess && !changed && <Alert variant="success">{t("common.saved")}</Alert>}
      <Button type="submit" className="w-fit" disabled={update.isPending || !changed}>
        {update.isPending ? t("common.working") : t("common.save")}
      </Button>
    </form>
  );
}
