import type { StaffMember } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useResetStaffPassword, useSwitchStaff } from "../hooks/use-staff";
import { TemporaryPasswordPanel } from "./temporary-password-panel";

interface MemberActionsProps {
  member: StaffMember;
  /** Switching people off or on is owner-only. */
  canSwitch: boolean;
  canReset: boolean;
}

type Confirming = "switch" | "reset" | null;

/** Switch off / switch on and reset password, each with one confirmation step. */
export function MemberActions({ member, canSwitch, canReset }: MemberActionsProps) {
  const { t } = useTranslation();
  const switcher = useSwitchStaff();
  const reset = useResetStaffPassword();
  const [confirming, setConfirming] = useState<Confirming>(null);
  // Shown once; kept only in this component's state and gone when the page is left.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const isOn = member.status === "active";

  const ask = (what: Confirming) => {
    switcher.reset();
    reset.reset();
    setTempPassword(null);
    setConfirming(what);
  };

  return (
    <div className="flex flex-col gap-3">
      {confirming === null && (
        <div className="flex flex-wrap gap-2">
          {canReset && isOn && (
            <Button variant="secondary" onClick={() => ask("reset")}>
              {t("staff.reset.button")}
            </Button>
          )}
          {canSwitch && (
            <Button variant={isOn ? "danger" : "primary"} onClick={() => ask("switch")}>
              {isOn ? t("staff.switchOff.button") : t("staff.switchOn.button")}
            </Button>
          )}
        </div>
      )}
      {confirming === "switch" && (
        <ConfirmPanel
          danger={isOn}
          message={t(isOn ? "staff.switchOff.confirm" : "staff.switchOn.confirm", {
            name: member.name,
          })}
          confirmLabel={isOn ? t("staff.switchOff.button") : t("staff.switchOn.button")}
          busy={switcher.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            switcher.mutate(
              { id: member.membershipId, on: !isOn },
              { onSuccess: () => setConfirming(null) },
            )
          }
        />
      )}
      {confirming === "reset" && (
        <ConfirmPanel
          message={t("staff.reset.confirm", { name: member.name })}
          confirmLabel={t("staff.reset.button")}
          busy={reset.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            reset.mutate(member.membershipId, {
              onSuccess: ({ temporaryPassword }) => {
                setTempPassword(temporaryPassword);
                setConfirming(null);
              },
            })
          }
        />
      )}
      {tempPassword && <TemporaryPasswordPanel name={member.name} password={tempPassword} />}
      <FormError error={switcher.error ?? reset.error} />
    </div>
  );
}
