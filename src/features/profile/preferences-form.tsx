"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api/client";

export function PreferencesForm() {
  const { token, preferences, setPreferences } = useAuth();
  const { push } = useToast();
  const { t } = useI18n();
  const preferenceDefaults = preferences
    ? {
        preferredGenres: preferences.preferredGenres.join(", "),
        avoidedGenres: preferences.avoidedGenres.join(", "),
        preferredTones: preferences.preferredTones.join(", "),
        avoidedThemes: preferences.avoidedThemes.join(", "),
        customPromptHints: preferences.customPromptHints.join(", "),
        storyOutputLanguage: preferences.storyOutputLanguage,
        themePreference: preferences.themePreference,
      }
    : {
        preferredGenres: "",
        avoidedGenres: "",
        preferredTones: "",
        avoidedThemes: "",
        customPromptHints: "",
        storyOutputLanguage: "en",
        themePreference: "system",
      };
  const [values, setValues] = useState({
    preferredGenres: "",
    avoidedGenres: "",
    preferredTones: "",
    avoidedThemes: "",
    customPromptHints: "",
    storyOutputLanguage: "en",
    themePreference: "system",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const displayValues = isDirty ? values : preferenceDefaults;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const source = isDirty ? values : preferenceDefaults;

    setIsSaving(true);

    try {
      const updated = await api.updatePreferences(token, {
        preferredGenres: splitList(source.preferredGenres),
        avoidedGenres: splitList(source.avoidedGenres),
        preferredTones: splitList(source.preferredTones),
        avoidedThemes: splitList(source.avoidedThemes),
        customPromptHints: splitList(source.customPromptHints),
        storyOutputLanguage: source.storyOutputLanguage as "en" | "vi",
        interfaceLanguage: preferences?.interfaceLanguage ?? "en",
        themePreference: source.themePreference as "light" | "dark" | "system",
      });
      setPreferences(updated);
      setIsDirty(false);
      push({
        title: t("settings.preferencesUpdated"),
        description: t("settings.preferencesUpdatedDescription"),
        tone: "success",
      });
    } catch (error) {
      push({
        title: t("settings.preferencesFailed"),
        description:
          error instanceof ApiClientError
            ? error.message
            : t(
                "settings.genericRequestFailed",
                "The request could not be completed.",
              ),
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-8">
      <p className="eyebrow-label text-xs font-semibold uppercase">
        {t("settings.profileEyebrow")}
      </p>
      <h1 className="mt-4 text-4xl font-semibold">
        {t("settings.profileTitle")}
      </h1>
      <div className="surface-panel mt-6 grid gap-4 rounded-[1.5rem] p-5 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">
            {t("settings.interfaceLanguage")}
          </p>
          <p className="text-ui-muted mt-1 text-sm leading-6">
            {t("settings.interfaceLanguageHelp")}
          </p>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">
            {t("settings.storyOutputLanguage")}
          </span>
          <span className="text-ui-muted mt-1 block text-sm leading-6">
            {t("settings.storyOutputLanguageHelp")}
          </span>
          <select
            className="control-select mt-3"
            value={displayValues.storyOutputLanguage}
            onChange={(event) => {
              setIsDirty(true);
              setValues((current) => ({
                ...current,
                storyOutputLanguage: event.target.value,
              }));
            }}
          >
            <option value="en">{t("common.english")}</option>
            <option value="vi">{t("common.vietnamese")}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">
            {t("settings.appearance")}
          </span>
          <span className="text-ui-muted mt-1 block text-sm leading-6">
            {t("settings.appearanceHelp")}
          </span>
          <span className="text-ui-faint mt-1 block text-xs leading-5">
            {t("settings.magicalDarkMode")}
          </span>
          <select
            className="control-select mt-3"
            value={displayValues.themePreference}
            onChange={(event) => {
              setIsDirty(true);
              setValues((current) => ({
                ...current,
                themePreference: event.target.value,
              }));
            }}
          >
            <option value="light">{t("settings.appearanceOptions.light")}</option>
            <option value="dark">{t("settings.appearanceOptions.dark")}</option>
            <option value="system">{t("settings.appearanceOptions.system")}</option>
          </select>
        </label>
      </div>
      <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
        <PreferenceField
          label={t("settings.preferredGenres")}
          value={displayValues.preferredGenres}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, preferredGenres: value }));
          }}
          placeholder={t(
            "settings.placeholders.preferredGenres",
            "mystery, sci-fi, politics",
          )}
        />
        <PreferenceField
          label={t("settings.avoidedGenres")}
          value={displayValues.avoidedGenres}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, avoidedGenres: value }));
          }}
          placeholder={t("settings.placeholders.avoidedGenres", "horror")}
        />
        <PreferenceField
          label={t("settings.preferredTones")}
          value={displayValues.preferredTones}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, preferredTones: value }));
          }}
          placeholder={t(
            "settings.placeholders.preferredTones",
            "lush, tense, intimate",
          )}
        />
        <PreferenceField
          label={t("settings.avoidedThemes")}
          value={displayValues.avoidedThemes}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, avoidedThemes: value }));
          }}
          placeholder={t(
            "settings.placeholders.avoidedThemes",
            "body horror, betrayal fatigue",
          )}
        />
        <div className="md:col-span-2">
          <PreferenceField
            label={t("settings.customPromptHints")}
            value={displayValues.customPromptHints}
            onChange={(value) => {
              setIsDirty(true);
              setValues((current) => ({
                ...current,
                customPromptHints: value,
              }));
            }}
            placeholder={t(
              "settings.placeholders.customPromptHints",
              "slow-burn romance, sharp dialogue, vivid cities",
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("common.saving") : t("settings.savePreferences")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PreferenceField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
