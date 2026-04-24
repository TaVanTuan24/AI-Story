"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { isLanguageCode, languageLabels, type LanguageCode } from "@/lib/i18n/types";
import { api } from "@/lib/api/client";

const STORAGE_KEY = "ai-story.interface-language";
const LANGUAGE_EVENT = "ai-story:language-change";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  dictionary: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { token, preferences, setPreferences } = useAuth();
  const localLanguage = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    getServerLanguage,
  );
  const language = isLanguageCode(preferences?.interfaceLanguage)
    ? preferences.interfaceLanguage
    : localLanguage;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const dictionary = useMemo(() => getDictionary(language), [language]);

  async function setLanguage(nextLanguage: LanguageCode) {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));

    if (token && preferences) {
      const updated = await api.updatePreferences(token, {
        preferredGenres: preferences.preferredGenres,
        avoidedGenres: preferences.avoidedGenres,
        preferredTones: preferences.preferredTones,
        avoidedThemes: preferences.avoidedThemes,
        customPromptHints: preferences.customPromptHints,
        interfaceLanguage: nextLanguage,
        storyOutputLanguage: preferences.storyOutputLanguage,
      });
      setPreferences(updated);
    }
  }

  const t = useCallback((key: string, fallback?: string) => {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string, unknown>)[part];
    }, dictionary);

    return typeof value === "string" ? value : fallback ?? key;
  }, [dictionary]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}

export { languageLabels };

function subscribeToLanguage(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(LANGUAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(LANGUAGE_EVENT, handleChange);
  };
}

function getStoredLanguage(): LanguageCode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLanguageCode(stored) ? stored : "en";
}

function getServerLanguage(): LanguageCode {
  return "en";
}
