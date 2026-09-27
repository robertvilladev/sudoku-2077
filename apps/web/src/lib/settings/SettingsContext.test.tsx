import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsProvider, useSettings } from "./SettingsContext.js";

describe("useSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("fx-off");
  });

  it("defaults each setting (humOn off, the rest on)", () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(result.current.soundOn).toBe(true);
    expect(result.current.scanlineOn).toBe(true);
    expect(result.current.autoClearNotesOn).toBe(true);
    expect(result.current.humOn).toBe(false);
  });

  it("persists a toggle to localStorage and reflects it in a fresh provider", () => {
    const { result, unmount } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    act(() => result.current.toggleScanline());
    expect(result.current.scanlineOn).toBe(false);
    expect(document.documentElement.classList.contains("fx-off")).toBe(true);

    unmount();

    const { result: reloaded } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(reloaded.current.scanlineOn).toBe(false);
  });

  it("defaults the locale to English and persists a change", () => {
    const { result, unmount } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(result.current.locale).toBe("en");

    act(() => result.current.setLocale("en"));
    unmount();

    expect(JSON.parse(localStorage.getItem("sudoku2077.settings") ?? "{}").locale).toBe("en");
  });

  it("falls back to English when the stored locale is not supported", () => {
    localStorage.setItem("sudoku2077.settings", JSON.stringify({ locale: "xx", soundOn: false }));
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    expect(result.current.locale).toBe("en");
    expect(result.current.soundOn).toBe(false);
  });
});
