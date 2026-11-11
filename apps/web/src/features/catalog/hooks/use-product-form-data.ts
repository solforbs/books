import { useAccess, useMyAccess } from "@/features/access/hooks/use-access";
import { useBusiness } from "@/features/business/hooks/use-business";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { workLocations } from "@/features/locations/visible-locations";
import type { FormContextData } from "../components/form-api";
import { useCategories } from "./use-categories";
import { useProductOptions } from "./use-products";

/**
 * Everything around the product that the add and edit forms need. Suggestions are optional:
 * if they fail to load, typing still works. A business whose VAT setting cannot be read is
 * treated as "no VAT", the shop default.
 */
export function useProductFormData() {
  const categories = useCategories();
  const options = useProductOptions();
  const business = useBusiness();
  const locations = useLocations();
  const access = useMyAccess();
  const { can } = useAccess();

  const error = categories.error ?? locations.error ?? access.error;
  const ready = Boolean(categories.data && locations.data && access.data && !business.isPending);
  const data: FormContextData = {
    options: options.data,
    locations: locations.data && access.data ? workLocations(locations.data, access.data) : [],
    vatEnabled: business.data?.vatEnabled ?? false,
    canSetPrices: can("set_prices"),
  };
  const retry = () => {
    void categories.refetch();
    void locations.refetch();
    void access.refetch();
  };
  return { ready, error, retry, data, categories: categories.data ?? [] };
}
