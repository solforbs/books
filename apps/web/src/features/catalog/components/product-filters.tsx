import type { Category } from "@books/shared";
import { ScanLine, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ProductFiltersProps {
  search: string;
  onSearch: (text: string) => void;
  categories: Category[];
  categoryId: string;
  onCategory: (id: string) => void;
  scanning: boolean;
  onToggleScan: () => void;
  /** Hidden products are for people who manage products. */
  canSeeHidden: boolean;
  showHidden: boolean;
  onShowHidden: (value: boolean) => void;
}

/** Search box with Scan, category filter, and (for managers) a switch for hidden products. */
export function ProductFilters(props: ProductFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
          />
          <Input
            type="search"
            aria-label={t("catalog.list.search")}
            placeholder={t("catalog.list.search")}
            className="pl-10"
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
          />
        </div>
        <Button variant="secondary" aria-expanded={props.scanning} onClick={props.onToggleScan}>
          <ScanLine aria-hidden className="h-5 w-5" />
          {t("catalog.list.scan")}
        </Button>
      </div>
      {props.categories.length > 0 && (
        <Select
          aria-label={t("catalog.list.filterCategory")}
          className="w-full"
          value={props.categoryId}
          onChange={(e) => props.onCategory(e.target.value)}
        >
          <option value="">{t("catalog.list.allCategories")}</option>
          {props.categories
            .filter((c) => !c.hidden)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      )}
      {props.canSeeHidden && (
        <Switch
          label={t("catalog.list.showHidden")}
          checked={props.showHidden}
          onChange={props.onShowHidden}
        />
      )}
    </div>
  );
}
