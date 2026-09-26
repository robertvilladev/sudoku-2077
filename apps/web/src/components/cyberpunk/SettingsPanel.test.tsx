import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../lib/i18n/I18nProvider.js";
import { SettingsProvider } from "../../lib/settings/SettingsContext.js";
import { SettingsPanel } from "./SettingsPanel.js";

function renderPanel() {
  return render(
    <SettingsProvider>
      <I18nProvider>
        <SettingsPanel />
      </I18nProvider>
    </SettingsProvider>
  );
}

describe("SettingsPanel", () => {
  beforeEach(() => localStorage.clear());

  it("switches the UI language and <html lang> from the language row", async () => {
    renderPanel();
    expect(screen.getByText("Language")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Español" }));

    expect(await screen.findByText("Idioma")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("shows every language in its own language", () => {
    renderPanel();
    for (const name of ["English", "Español", "Français", "Català"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
  });

  it("restores a stored language on load", async () => {
    localStorage.setItem("sudoku2077.settings", JSON.stringify({ locale: "ca" }));
    renderPanel();
    expect(await screen.findByText("Idioma")).toBeInTheDocument();
    expect(screen.getByText("Efectes de so")).toBeInTheDocument();
  });
});
