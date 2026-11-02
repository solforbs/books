import { House, Settings, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useAccess } from "@/features/access/hooks/use-access";
import { visibleSettingsEntries } from "@/features/settings/settings-entries";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  const access = useAccess();
  const items: NavItem[] = [{ to: "/", label: t("nav.home"), icon: House, end: true }];
  // Settings appears only when at least one settings page is usable (no dead buttons).
  if (visibleSettingsEntries(access).length > 0) {
    items.push({ to: "/settings", label: t("nav.settings"), icon: Settings, end: false });
  }
  return items;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex min-h-tap items-center gap-2 rounded-lg px-3 font-semibold text-slate-800",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40",
    isActive ? "bg-brand-light text-brand-dark" : "hover:bg-slate-100",
  );

/** Side navigation on tablets and computers. */
export function SideNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.label")} className="hidden w-52 shrink-0 md:block">
      <ul className="flex flex-col gap-1">
        {useNavItems().map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className={linkClass}>
              <item.icon aria-hidden className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Bottom bar on phones, within reach of the thumb. */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white md:hidden"
    >
      <ul className="flex justify-around px-2 py-1">
        {useNavItems().map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={(state) => cn(linkClass(state), "flex-col justify-center gap-0 text-sm")}
            >
              <item.icon aria-hidden className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
