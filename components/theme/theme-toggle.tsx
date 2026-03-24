"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon, SystemIcon } from "@/components/ui/icons";

const STORAGE_KEY = "humor-control-room-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEME_EVENT = "humor-control-room-theme-change";

type ThemeMode = "dark" | "light" | "system";

const THEME_OPTIONS: Array<{
  icon: typeof MoonIcon;
  label: string;
  value: ThemeMode;
}> = [
  { icon: SunIcon, label: "Light mode", value: "light" },
  { icon: MoonIcon, label: "Dark mode", value: "dark" },
  { icon: SystemIcon, label: "System mode", value: "system" },
];

function applyTheme(nextTheme: ThemeMode) {
  const resolvedTheme =
    nextTheme === "system"
      ? window.matchMedia(MEDIA_QUERY).matches
        ? "dark"
        : "light"
      : nextTheme;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = nextTheme;
  document.documentElement.style.colorScheme = resolvedTheme;

  try {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage issues. Theme still applies to the current page.
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

function getStoredTheme() {
  if (typeof window === "undefined") {
    return "system" as ThemeMode;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system" as ThemeMode;
  } catch {
    return "system" as ThemeMode;
  }
}

function getDocumentThemeMode() {
  if (typeof document === "undefined") {
    return "system" as ThemeMode;
  }

  const mode = document.documentElement.dataset.themeMode;

  if (mode === "light" || mode === "dark" || mode === "system") {
    return mode;
  }

  return getStoredTheme();
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(MEDIA_QUERY);
  const handleThemeChange = () => onStoreChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };
  const handleMediaChange = () => {
    if (getDocumentThemeMode() === "system") {
      applyTheme("system");
    }
  };

  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getDocumentThemeMode, () => "system" as ThemeMode);

  return (
    <div aria-label="Theme mode" className="theme-toggle-group" role="group">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            aria-label={option.label}
            aria-pressed={isActive}
            className={`theme-option ${isActive ? "theme-option-active" : ""}`}
            key={option.value}
            onClick={() => applyTheme(option.value)}
            title={option.label}
            type="button"
          >
            <Icon />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
