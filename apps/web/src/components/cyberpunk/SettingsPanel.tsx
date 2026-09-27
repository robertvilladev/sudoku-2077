import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LANGUAGE_NAMES, LOCALES, isLocale } from "../../lib/i18n/locales.js";
import { useSettings } from "../../lib/settings/SettingsContext.js";

// Shared by the in-game pause dialog and the title menu's SETTINGS dialog.
export function SettingsPanel() {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-3">
      <SettingRow
        label={<FormattedMessage id="settingSound" />}
        value={settings.soundOn}
        onToggle={settings.toggleSound}
      />
      <SettingRow
        label={<FormattedMessage id="settingScanline" />}
        value={settings.scanlineOn}
        onToggle={settings.toggleScanline}
      />
      <SettingRow
        label={<FormattedMessage id="settingAutoClearNotes" />}
        value={settings.autoClearNotesOn}
        onToggle={settings.toggleAutoClearNotes}
      />
      <SettingRow
        label={<FormattedMessage id="settingHum" />}
        value={settings.humOn}
        onToggle={settings.toggleHum}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-neutral-500">
        <span className="uppercase">
          <FormattedMessage id="settingLanguage" />
        </span>
        <ToggleGroup
          type="single"
          value={settings.locale}
          onValueChange={(value) => isLocale(value) && settings.setLocale(value)}
          className="flex-wrap"
        >
          {LOCALES.map((locale) => (
            <ToggleGroupItem key={locale} value={locale} lang={locale}>
              {LANGUAGE_NAMES[locale]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

function SettingRow({ label, value, onToggle }: { label: ReactNode; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs text-neutral-500 uppercase">
      <span>{label}</span>
      <ToggleGroup type="single" value={value ? "on" : "off"} onValueChange={(v) => v && onToggle()}>
        <ToggleGroupItem value="on">
          <FormattedMessage id="settingOn" />
        </ToggleGroupItem>
        <ToggleGroupItem value="off">
          <FormattedMessage id="settingOff" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
