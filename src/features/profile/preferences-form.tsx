"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api/client";

export function PreferencesForm() {
  const { token, preferences, setPreferences } = useAuth();
  const { push } = useToast();
  const preferenceDefaults = preferences
    ? {
        preferredGenres: preferences.preferredGenres.join(", "),
        avoidedGenres: preferences.avoidedGenres.join(", "),
        preferredTones: preferences.preferredTones.join(", "),
        avoidedThemes: preferences.avoidedThemes.join(", "),
        customPromptHints: preferences.customPromptHints.join(", "),
      }
    : {
        preferredGenres: "",
        avoidedGenres: "",
        preferredTones: "",
        avoidedThemes: "",
        customPromptHints: "",
      };
  const [values, setValues] = useState({
    preferredGenres: "",
    avoidedGenres: "",
    preferredTones: "",
    avoidedThemes: "",
    customPromptHints: "",
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
      });
      setPreferences(updated);
      setIsDirty(false);
      push({
        title: "Preferences updated",
        description: "Future sessions can now lean closer to your tastes.",
        tone: "success",
      });
    } catch (error) {
      push({
        title: "Could not save preferences",
        description:
          error instanceof ApiClientError ? error.message : "The request could not be completed.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-8">
      <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[color:var(--accent)]">
        Profile Preferences
      </p>
      <h1 className="mt-4 text-4xl font-semibold">Tune what your fiction leans toward</h1>
      <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
        <PreferenceField
          label="Preferred genres"
          value={displayValues.preferredGenres}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, preferredGenres: value }));
          }}
          placeholder="mystery, sci-fi, politics"
        />
        <PreferenceField
          label="Avoided genres"
          value={displayValues.avoidedGenres}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, avoidedGenres: value }));
          }}
          placeholder="horror"
        />
        <PreferenceField
          label="Preferred tones"
          value={displayValues.preferredTones}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, preferredTones: value }));
          }}
          placeholder="lush, tense, intimate"
        />
        <PreferenceField
          label="Avoided themes"
          value={displayValues.avoidedThemes}
          onChange={(value) => {
            setIsDirty(true);
            setValues((current) => ({ ...current, avoidedThemes: value }));
          }}
          placeholder="body horror, betrayal fatigue"
        />
        <div className="md:col-span-2">
          <PreferenceField
            label="Custom prompt hints"
            value={displayValues.customPromptHints}
            onChange={(value) => {
              setIsDirty(true);
              setValues((current) => ({ ...current, customPromptHints: value }));
            }}
            placeholder="slow-burn romance, sharp dialogue, vivid cities"
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save preferences"}
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
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
