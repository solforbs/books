import type { en } from "./en";

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

/** Shape every language file must follow: the same keys as English, any text. */
export type Translations = DeepStrings<typeof en>;
