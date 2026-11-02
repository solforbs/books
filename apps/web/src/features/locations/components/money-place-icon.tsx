import type { MoneyPlaceType } from "@books/shared";
import { Banknote, Landmark, ReceiptText, Smartphone, Vault, type LucideIcon } from "lucide-react";

const ICONS: Record<MoneyPlaceType, LucideIcon> = {
  cash_drawer: Banknote,
  mpesa_till: Smartphone,
  mpesa_paybill: ReceiptText,
  bank: Landmark,
  safe: Vault,
};

export function MoneyPlaceIcon({ type }: { type: MoneyPlaceType }) {
  const Icon = ICONS[type];
  return <Icon aria-hidden className="h-6 w-6 shrink-0 text-brand-dark" />;
}
