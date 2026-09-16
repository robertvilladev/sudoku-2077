import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface Settings {
  soundOn: boolean;
  scanlineOn: boolean;
  autoClearNotesOn: boolean;
  humOn: boolean;
}

interface SettingsState extends Settings {
  toggleSound: () => void;
  toggleScanline: () => void;
  toggleAutoClearNotes: () => void;
  toggleHum: () => void;
}

const STORAGE_KEY = "sudoku2077.settings";

const DEFAULTS: Settings = {
  soundOn: true,
  scanlineOn: true,
  autoClearNotesOn: true,
  humOn: false,
};

function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

// scanlineOn also gates every other decorative/ambient effect (CRT flicker, glitch, selection-ring
// motion), not just the literal scanline texture — see docs/plan for why the toggle's scope was
// widened past its mockup label.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readStoredSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage unavailable (private browsing, etc.) — settings just won't persist.
    }
    document.documentElement.classList.toggle("fx-off", !settings.scanlineOn);
  }, [settings]);

  const value = useMemo<SettingsState>(
    () => ({
      ...settings,
      toggleSound: () => setSettings((prev) => ({ ...prev, soundOn: !prev.soundOn })),
      toggleScanline: () => setSettings((prev) => ({ ...prev, scanlineOn: !prev.scanlineOn })),
      toggleAutoClearNotes: () =>
        setSettings((prev) => ({ ...prev, autoClearNotesOn: !prev.autoClearNotesOn })),
      toggleHum: () => setSettings((prev) => ({ ...prev, humOn: !prev.humOn })),
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its context/provider
export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
