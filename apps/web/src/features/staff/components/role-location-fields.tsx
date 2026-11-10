import type { Location, Role } from "@books/shared";
import { useTranslation } from "react-i18next";
import { CheckboxList } from "@/components/checkbox-list";
import { FormField } from "@/components/form-field";
import { Select } from "@/components/ui/select";

interface RoleLocationFieldsProps {
  roles: readonly Role[];
  locations: Location[];
  role: Role;
  locationIds: string[];
  onRoleChange: (role: Role) => void;
  onLocationsChange: (ids: string[]) => void;
  locationError?: string | undefined;
}

/** Role, then which locations. Owners work everywhere, so they get no location choice. */
export function RoleLocationFields(props: RoleLocationFieldsProps) {
  const { t } = useTranslation();
  const { roles, locations, role, locationIds, locationError } = props;
  return (
    <>
      <FormField label={t("staff.role")} hint={t(`staff.roleHint.${role}`)}>
        {(a11y) => (
          <Select
            {...a11y}
            value={role}
            onChange={(e) => props.onRoleChange(e.target.value as Role)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {role === "owner" ? (
        <p className="text-base text-slate-700">{t("staff.ownerAllLocations")}</p>
      ) : (
        <CheckboxList
          legend={t("staff.locations")}
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          selected={locationIds}
          onChange={props.onLocationsChange}
          error={locationError}
        />
      )}
    </>
  );
}
