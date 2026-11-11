import type { TFunction } from "i18next";
import type { Choice } from "@/components/choice-group";
import { NAMING_MODES, TRACKING_TYPES, type TrackingType } from "@books/shared";

export const trackingChoices = (t: TFunction): Choice<TrackingType>[] =>
  TRACKING_TYPES.map((value) => ({ value, label: t(`catalog.tracking.${value}`) }));

export const namingChoices = (t: TFunction): Choice<(typeof NAMING_MODES)[number]>[] =>
  NAMING_MODES.map((value) => ({ value, label: t(`catalog.naming.${value}`) }));
