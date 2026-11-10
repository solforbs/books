import type { Location } from "@books/shared";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { readDeviceValue, writeDeviceValue } from "@/lib/device-storage";

interface CurrentLocationValue {
  /** Locations this person can switch between (open, allowed). */
  locations: Location[];
  current: Location | undefined;
  select: (id: string) => void;
}

const CurrentLocationContext = createContext<CurrentLocationValue>({
  locations: [],
  current: undefined,
  select: () => undefined,
});

/** The chosen location is remembered per device and per business. */
export const locationStorageKey = (tenantId: string) => `books.location.${tenantId}`;

export function CurrentLocationProvider({
  tenantId,
  locations,
  children,
}: {
  tenantId: string;
  locations: Location[];
  children: ReactNode;
}) {
  const [chosenId, setChosenId] = useState(() => readDeviceValue(locationStorageKey(tenantId)));
  // A remembered location that was closed or unassigned falls back to the first allowed one.
  const current = locations.find((l) => l.id === chosenId) ?? locations[0];

  const select = useCallback(
    (id: string) => {
      setChosenId(id);
      writeDeviceValue(locationStorageKey(tenantId), id);
    },
    [tenantId],
  );

  const value = useMemo(() => ({ locations, current, select }), [locations, current, select]);
  return (
    <CurrentLocationContext.Provider value={value}>{children}</CurrentLocationContext.Provider>
  );
}

export function useCurrentLocation(): CurrentLocationValue {
  return useContext(CurrentLocationContext);
}
