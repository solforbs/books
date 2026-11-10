import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { MoreSection } from "@/components/more-section";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/features/access/hooks/use-access";
import { useSession } from "@/features/auth/hooks/use-session";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { LoginHistory } from "../components/login-history";
import { MemberActions } from "../components/member-actions";
import { MemberRoleForm } from "../components/member-role-form";
import { PermissionSwitches } from "../components/permission-switches";
import { lastLoginText, memberLocationNames } from "../format";
import { useStaffList } from "../hooks/use-staff";
import { canResetPassword } from "../staff-scope";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 sm:p-6">
      <h2 className="font-heading text-xl font-bold text-slate-900">{title}</h2>
      {children}
    </Card>
  );
}

/**
 * One staff member. Owners can change role, locations and switches, switch people off and see
 * login history. Others (managers with "add staff") can only reset a helper's password.
 * Nobody changes their own role or switches (`cannot_change_self`), so those are not offered.
 */
export function StaffDetailPage() {
  const { t, i18n } = useTranslation();
  const { membershipId = "" } = useParams();
  const access = useAccess();
  const myUserId = useSession().data?.user.id;
  const staff = useStaffList();
  const locations = useLocations().data ?? [];

  const frame = (children: ReactNode, title = t("settings.staff.title")) => (
    <SettingsPage title={title} backTo="/settings/staff">
      {children}
    </SettingsPage>
  );
  if (staff.error)
    return frame(<LoadError error={staff.error} onRetry={() => void staff.refetch()} />);
  if (!staff.data) return frame(<LoadingText />);
  const member = staff.data.find((m) => m.membershipId === membershipId);
  if (!member) return frame(<Alert variant="error">{t("errors.member_not_found")}</Alert>);

  const isSelf = member.userId === myUserId;
  const ownerControls = access.isOwner && !isSelf;
  const canReset = !isSelf && canResetPassword(access, member);
  const summary = [
    t(`role.${member.role}`),
    memberLocationNames(member, locations, t),
    t(`staff.status.${member.status}`),
  ];

  return frame(
    <>
      <div className="text-base text-slate-700">
        <p>{summary.filter(Boolean).join(" · ")}</p>
        <p>{[member.phone, member.email].filter(Boolean).join(" · ")}</p>
        <p>{lastLoginText(member, i18n.language, t)}</p>
      </div>
      {isSelf && <Alert variant="info">{t("staff.selfNote")}</Alert>}
      {ownerControls && (
        <Section title={t("staff.roleSection")}>
          <MemberRoleForm member={member} />
          {member.role !== "owner" && (
            <MoreSection label={t("staff.switches.more")}>
              <PermissionSwitches key={member.role} member={member} />
            </MoreSection>
          )}
        </Section>
      )}
      {(ownerControls || canReset) && (
        <Section title={t("staff.accessSection")}>
          <MemberActions member={member} canSwitch={ownerControls} canReset={canReset} />
        </Section>
      )}
      {access.isOwner && (
        <Section title={t("staff.history.title")}>
          <LoginHistory membershipId={member.membershipId} />
        </Section>
      )}
    </>,
    member.name,
  );
}
