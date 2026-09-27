import type { ReactNode } from "react";
import { IntlProvider } from "react-intl";
import en from "@sudoku-2077/i18n/en.json";

// Tests render in English, so existing getByText/getByLabelText queries keep matching the catalog.
export function TestIntlProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" defaultLocale="en" messages={en}>
      {children}
    </IntlProvider>
  );
}
