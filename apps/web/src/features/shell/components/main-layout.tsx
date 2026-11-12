import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { useMyAccess } from "@/features/access/hooks/use-access";
import { useTenantId } from "@/features/access/hooks/use-tenant";
import { CurrentLocationProvider } from "@/features/locations/hooks/current-location";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { NoLocationPage } from "@/features/locations/pages/no-location-page";
import { workLocations } from "@/features/locations/visible-locations";
import { cn } from "@/lib/utils";
import { BottomNav, SideNav } from "./main-nav";
import { TopBar } from "./top-bar";

/** The stock-in sheet is a grid on large screens, so it gets more width than other pages. */
const WIDE_PAGES = ["/receiving/new"];

function Frame({ children, nav }: { children: ReactNode; nav: boolean }) {
  const wide = WIDE_PAGES.includes(useLocation().pathname);
  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <TopBar showLocations={nav} />
      <div className={cn("mx-auto flex gap-6 px-4 py-6", wide ? "max-w-7xl" : "max-w-5xl")}>
        {nav && <SideNav />}
        <main
          className={cn("flex min-w-0 flex-1 flex-col gap-4", wide ? "max-w-5xl" : "max-w-2xl")}
        >
          {children}
        </main>
      </div>
      {nav && <BottomNav />}
    </div>
  );
}

/**
 * Everything after login. Loads what this person may do and where they work; a business
 * without an open location first gets the one-screen "Where do you sell?" setup.
 */
export function MainLayout() {
  const tenantId = useTenantId();
  const access = useMyAccess();
  const locations = useLocations();
  const allowed =
    access.data && locations.data ? workLocations(locations.data, access.data) : EMPTY;
  const ready = allowed.length > 0;

  let content: ReactNode;
  if (access.error || locations.error) {
    const retry = () => {
      if (access.error) void access.refetch();
      if (locations.error) void locations.refetch();
    };
    content = <LoadError error={access.error ?? locations.error} onRetry={retry} />;
  } else if (!access.data || !locations.data) {
    content = <LoadingText />;
  } else if (!ready) {
    content = <NoLocationPage isOwner={access.data.role === "owner"} />;
  } else {
    content = <Outlet />;
  }

  // One stable tree, so the top bar (and its buttons) is never re-created while data loads.
  return (
    <CurrentLocationProvider key={tenantId} tenantId={tenantId} locations={allowed}>
      <Frame nav={ready && !access.error && !locations.error}>{content}</Frame>
    </CurrentLocationProvider>
  );
}

const EMPTY: never[] = [];
