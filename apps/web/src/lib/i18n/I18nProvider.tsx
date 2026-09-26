import { useEffect, useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import en from "@sudoku-2077/i18n/en.json";
import { useSettings } from "../settings/SettingsContext.js";
import type { Locale } from "./locales.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- react-intl's documented typing hook
  namespace FormatjsIntl {
    interface Message {
      ids: keyof typeof en;
    }
  }
}

// Every catalog has the same keys (packages/i18n checks it), so each one types as English.
type Messages = typeof en;

// English is bundled (it is also the fallback for missing keys); the rest load on demand.
const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Messages }>> = {
  es: () => import("@sudoku-2077/i18n/es.json"),
  fr: () => import("@sudoku-2077/i18n/fr.json"),
  ca: () => import("@sudoku-2077/i18n/ca.json"),
};

interface Loaded {
  locale: Locale;
  messages: Messages;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useSettings();
  // null only while a stored non-English locale loads on first paint, so English never flashes.
  const [loaded, setLoaded] = useState<Loaded | null>(() =>
    locale === "en" ? { locale, messages: en } : null
  );

  useEffect(() => {
    if (locale === "en") {
      setLoaded({ locale, messages: en });
      return;
    }
    let cancelled = false;
    loaders[locale]()
      .then((module) => !cancelled && setLoaded({ locale, messages: module.default }))
      .catch(() => !cancelled && setLoaded({ locale: "en", messages: en }));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (loaded) document.documentElement.lang = loaded.locale;
  }, [loaded]);

  if (!loaded) return null;

  return (
    <IntlProvider locale={loaded.locale} defaultLocale="en" messages={loaded.messages}>
      {children}
    </IntlProvider>
  );
}
