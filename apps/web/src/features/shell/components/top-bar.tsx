import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { useSession } from "@/features/auth/hooks/use-session";
import { activeBusinessName } from "@/features/auth/session-step";
import { LocationSwitcher } from "@/features/locations/components/location-switcher";

/** Business name, location switcher (only with several locations), language and logout. */
export function TopBar({ showLocations = true }: { showLocations?: boolean }) {
  const session = useSession().data;
  const businessName = session ? activeBusinessName(session) : undefined;
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span
          className="font-heading text-xl font-bold text-brand-dark"
          data-testid="business-name"
        >
          {businessName}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {showLocations && <LocationSwitcher />}
          <LanguageSwitch />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
