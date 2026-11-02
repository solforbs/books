import { ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { lastLoginText, memberLocationNames } from "../format";
import { useStaffList } from "../hooks/use-staff";

/** Settings -> Staff: everyone this person may manage, with role, locations and last login. */
export function StaffListPage() {
  const { t, i18n } = useTranslation();
  const staff = useStaffList();
  const locations = useLocations().data ?? [];

  const addButton = (
    <Link
      to="/settings/staff/new"
      className="inline-flex min-h-tap items-center gap-2 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
    >
      <Plus aria-hidden className="h-5 w-5" />
      {t("staff.add")}
    </Link>
  );

  return (
    <SettingsPage title={t("settings.staff.title")} action={addButton}>
      {staff.error && <LoadError error={staff.error} onRetry={() => void staff.refetch()} />}
      {!staff.error && !staff.data && <LoadingText />}
      {staff.data && (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {staff.data.map((m) => (
            <li key={m.membershipId}>
              <Link
                to={`/settings/staff/${encodeURIComponent(m.membershipId)}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-slate-900">
                    {m.name}
                    {m.status === "switched_off" && (
                      <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-sm font-semibold text-slate-800">
                        {t("staff.status.switched_off")}
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-slate-700">
                    {[t(`role.${m.role}`), memberLocationNames(m, locations, t), m.phone ?? m.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="block text-sm text-slate-600">
                    {lastLoginText(m, i18n.language, t)}
                  </span>
                </span>
                <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-slate-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SettingsPage>
  );
}
