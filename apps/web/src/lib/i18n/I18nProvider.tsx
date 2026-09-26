import { useEffect, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import en from "@sudoku-2077/i18n/en.json";
import { useSettings } from "../settings/SettingsContext.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- react-intl's documented typing hook
  namespace FormatjsIntl {
    interface Message {
      ids: keyof typeof en;
    }
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useSettings();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider locale={locale} defaultLocale="en" messages={en}>
      {children}
    </IntlProvider>
  );
}
