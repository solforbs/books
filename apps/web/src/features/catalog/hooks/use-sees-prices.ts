import { useBusiness } from "@/features/business/hooks/use-business";
import { useAccess } from "@/features/access/hooks/use-access";

/**
 * Whether selling prices may be shown to this person at all (F01 §11). Storekeepers without
 * `set_prices` lose them when the owner switched "hide prices from storekeepers" on. The API
 * already sends no prices then; this keeps the screens from showing empty price rows or hints.
 * While the setting is still loading, a storekeeper sees none (never a flash of prices).
 */
export function useSeesPrices(): boolean {
  const { data, can } = useAccess();
  const business = useBusiness();
  if (data?.role !== "storekeeper" || can("set_prices")) return true;
  return business.data?.hidePricesFromStorekeepers === false;
}
