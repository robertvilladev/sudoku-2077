export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Always shown in their own language, never translated, so a player who picked the wrong language
// can still find theirs.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
