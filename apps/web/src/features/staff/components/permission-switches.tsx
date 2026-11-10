import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  effectivePermissions,
  type Permission,
  type PermissionOverrides,
  type StaffMember,
} from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/features/auth/components/form-error";
import { useUpdateStaff } from "../hooks/use-staff";

/** Only differences from the role's defaults are kept as per-person switches. */
function toOverrides(member: StaffMember, on: Set<Permission>): PermissionOverrides {
  const defaults = ROLE_DEFAULT_PERMISSIONS[member.role];
  const overrides: PermissionOverrides = {};
  for (const p of PERMISSIONS) {
    if (on.has(p) !== defaults.has(p)) overrides[p] = on.has(p);
  }
  return overrides;
}

/**
 * Owner only, behind "More" (F02 §4.2). Each switch starts at the role's default plus this
 * person's existing changes, so most owners never need to touch them.
 */
export function PermissionSwitches({ member }: { member: StaffMember }) {
  const { t } = useTranslation();
  const update = useUpdateStaff();
  const [on, setOn] = useState(() => effectivePermissions(member.role, member.permissions));
  const defaults = ROLE_DEFAULT_PERMISSIONS[member.role];
  const saved = effectivePermissions(member.role, member.permissions);
  const changed = PERMISSIONS.some((p) => on.has(p) !== saved.has(p));

  const toggle = (permission: Permission, value: boolean) => {
    update.reset();
    setOn((current) => {
      const next = new Set(current);
      if (value) next.add(permission);
      else next.delete(permission);
      return next;
    });
  };

  const save = () =>
    update.mutate({
      id: member.membershipId,
      body: { permissions: toOverrides(member, on) },
    });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-base text-slate-700">{t("staff.switches.intro")}</p>
      {PERMISSIONS.map((p) => (
        <Switch
          key={p}
          label={t(`permission.${p}`)}
          description={
            on.has(p) === defaults.has(p)
              ? t("staff.switches.roleDefault")
              : t("staff.switches.changed")
          }
          checked={on.has(p)}
          onChange={(value) => toggle(p, value)}
        />
      ))}
      <FormError error={update.error} />
      {update.isSuccess && !changed && <Alert variant="success">{t("common.saved")}</Alert>}
      <Button className="w-fit" disabled={!changed || update.isPending} onClick={save}>
        {update.isPending ? t("common.working") : t("staff.switches.save")}
      </Button>
    </div>
  );
}
