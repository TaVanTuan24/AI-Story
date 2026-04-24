"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api/client";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = "ai-story.theme-preference";
const THEME_EVENT = "ai-story:theme-change";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { token, preferences, setPreferences } = useAuth();
  const storedTheme = useSyncExternalStore(
    subscribeToThemePreference,
    getStoredThemePreference,
    getServerThemePreference,
  );
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getServerResolvedTheme,
  );

  const themePreference =
    preferences?.themePreference === "light" ||
    preferences?.themePreference === "dark" ||
    preferences?.themePreference === "system"
      ? preferences.themePreference
      : storedTheme;

  const resolvedTheme =
    themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      resolvedTheme,
      async setThemePreference(nextPreference) {
        window.localStorage.setItem(STORAGE_KEY, nextPreference);
        window.dispatchEvent(new Event(THEME_EVENT));
        applyTheme(nextPreference === "system" ? getSystemTheme() : nextPreference);

        if (token && preferences) {
          const updated = await api.updatePreferences(token, {
            preferredGenres: preferences.preferredGenres,
            avoidedGenres: preferences.avoidedGenres,
            preferredTones: preferences.preferredTones,
            avoidedThemes: preferences.avoidedThemes,
            customPromptHints: preferences.customPromptHints,
            interfaceLanguage: preferences.interfaceLanguage,
            storyOutputLanguage: preferences.storyOutputLanguage,
            themePreference: nextPreference,
          });
          setPreferences(updated);
        }
      },
    }),
    [preferences, resolvedTheme, setPreferences, themePreference, token],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}

function subscribeToThemePreference(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_EVENT, handleChange);
  };
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onStoreChange();
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

function getStoredThemePreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function getServerThemePreference(): ThemePreference {
  return "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerResolvedTheme(): ResolvedTheme {
  return "light";
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
