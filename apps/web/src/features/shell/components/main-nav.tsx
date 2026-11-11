import { House, Package, Settings, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useAccess } from "@/features/access/hooks/use-access";
import { useWaitingProducts } from "@/features/catalog/hooks/use-waiting-products";
import { visibleSettingsEntries } from "@/features/settings/settings-entries";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  /** A small count next to the label, for example products waiting for approval. */
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  const access = useAccess();
  const waiting = useWaitingProducts();
  const items: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: House, end: true },
    // Every member can read products. The count appears only for approvers with items waiting.
    {
      to: "/products",
      label: t("nav.products"),
      icon: Package,
      end: false,
      ...(waiting.count > 0 ? { badge: waiting.count } : {}),
    },
  ];
  // Settings appears only when at least one settings page is usable (no dead buttons).
  if (visibleSettingsEntries(access).length > 0) {
    items.push({ to: "/settings", label: t("nav.settings"), icon: Settings, end: false });
  }
  return items;
}

function NavBadge({ count }: { count: number | undefined }) {
  const { t } = useTranslation();
  if (!count) return null;
  return (
    <span
      aria-label={t("catalog.nav.waiting", { count })}
      className="min-w-6 rounded-full bg-amber-500 px-2 text-center text-sm font-bold text-slate-900"
    >
      {count}
    </span>
  );
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
              <NavBadge count={item.badge} />
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
              <NavBadge count={item.badge} />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
