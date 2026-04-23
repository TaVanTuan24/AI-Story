"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { demoSeeds, type DemoSeed } from "@/features/story/demo-seeds";

const schema = z.object({
  titleHint: z.string().max(120).optional(),
  premise: z.string().min(12, "Give the session a stronger premise.").max(2_000),
  seedPrompt: z.string().max(500).optional(),
  genre: z.string().min(1),
  tone: z.string().min(3, "Choose a stronger tone."),
  enginePreset: z.string().min(1),
  difficulty: z.string().min(1),
  lengthPreference: z.string().min(1),
  deterministic: z.boolean(),
  seed: z.string().max(120).optional(),
});

const genres = [
  "fantasy",
  "mystery",
  "romance",
  "sci-fi",
  "horror",
  "politics",
  "school-life",
  "survival",
  "custom",
];

export function CreateSessionForm() {
  const router = useRouter();
  const { token } = useAuth();
  const { push } = useToast();
  const [values, setValues] = useState({
    titleHint: "",
    premise: "",
    seedPrompt: "",
    genre: "mystery",
    tone: "cinematic and tense",
    enginePreset: "mystery",
    difficulty: "standard",
    lengthPreference: "endless",
    deterministic: false,
    seed: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);

  function applyDemoSeed(seed: DemoSeed) {
    setSelectedSeedId(seed.id);
    setValues((current) => ({
      ...current,
      titleHint: seed.titleHint,
      premise: seed.premise,
      seedPrompt: seed.seedPrompt,
      genre: seed.genre,
      tone: seed.tone,
      enginePreset: seed.enginePreset,
      difficulty: seed.difficulty,
      lengthPreference: seed.lengthPreference,
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid field"]),
        ),
      );
      return;
    }

    if (!token) {
      push({
        title: "Login required",
        description: "You need an account before creating a session.",
        tone: "error",
      });
      router.replace("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await api.createSession(token, {
        ...values,
        titleHint: values.titleHint || undefined,
        seedPrompt: values.seedPrompt || undefined,
        seed: values.seed || undefined,
      });
      push({
        title: "Session created",
        description: "Your new story session is ready to open.",
        tone: "success",
      });
      router.push(`/story-sessions/${session.id}`);
    } catch (error) {
      push({
        title: "Could not create session",
        description:
          error instanceof ApiClientError ? error.message : "Server request failed.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_24rem]" onSubmit={onSubmit}>
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/80 to-transparent" />
        <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[color:var(--accent)]">
          Session Blueprint
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-balance">
          Create a new playable world
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-black/62 sm:text-base">
          Pick a demo-ready seed or write your own premise. The app only saves the
          blueprint here; scenes are generated later by the configured AI provider.
        </p>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                Demo Seeds
              </p>
              <p className="mt-2 text-sm leading-6 text-black/58">
                Quick-start examples for live demos.
              </p>
            </div>
            {selectedSeedId ? (
              <button
                type="button"
                className="text-sm font-semibold text-[color:var(--accent)] transition hover:text-black"
                onClick={() => setSelectedSeedId(null)}
              >
                Selected
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {demoSeeds.map((seed) => (
              <button
                key={seed.id}
                type="button"
                onClick={() => applyDemoSeed(seed)}
                className={cn(
                  "rounded-[1.35rem] border border-[color:var(--border)] bg-white/60 px-4 py-4 text-left shadow-[var(--shadow-soft)] transition duration-200",
                  "hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent-soft)]",
                  selectedSeedId === seed.id && "border-[color:var(--accent)] bg-white",
                )}
              >
                <span className="text-sm font-semibold text-black/86">{seed.label}</span>
                <span className="mt-2 line-clamp-2 block text-xs leading-5 text-black/56">
                  {seed.premise}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 space-y-5">
          <Field label="Session title hint" error={errors.titleHint}>
            <Input
              value={values.titleHint}
              onChange={(event) => setValues((current) => ({ ...current, titleHint: event.target.value }))}
              placeholder="The Lantern Beyond Ninth Street"
            />
          </Field>

          <Field label="Core premise" error={errors.premise}>
            <Textarea
              value={values.premise}
              onChange={(event) => setValues((current) => ({ ...current, premise: event.target.value }))}
              placeholder="A missing brother leaves messages that predict crimes one night before they happen."
              className="min-h-40"
            />
          </Field>

          <Field label="Optional seed prompt" error={errors.seedPrompt}>
            <Textarea
              value={values.seedPrompt}
              onChange={(event) => setValues((current) => ({ ...current, seedPrompt: event.target.value }))}
              placeholder="A haunted university in 2090"
              className="min-h-24"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-6 sm:p-8 lg:sticky lg:top-24 lg:self-start">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
          Session Controls
        </p>
        <p className="mt-3 text-sm leading-6 text-black/58">
          These controls shape the opening context sent to the provider.
        </p>
        <div className="mt-6 space-y-4">
          <SelectField
            label="Genre"
            value={values.genre}
            onChange={(genre) => setValues((current) => ({ ...current, genre }))}
            options={genres}
          />
          <Field label="Tone" error={errors.tone}>
            <Input
              value={values.tone}
              onChange={(event) => setValues((current) => ({ ...current, tone: event.target.value }))}
              placeholder="romantic and volatile"
            />
          </Field>
          <SelectField
            label="Engine preset"
            value={values.enginePreset}
            onChange={(enginePreset) =>
              setValues((current) => ({ ...current, enginePreset }))
            }
            options={["freeform", "rpg-lite", "mystery", "social-drama"]}
          />
          <SelectField
            label="Difficulty"
            value={values.difficulty}
            onChange={(difficulty) => setValues((current) => ({ ...current, difficulty }))}
            options={["relaxed", "standard", "hard"]}
          />
          <SelectField
            label="Length preference"
            value={values.lengthPreference}
            onChange={(lengthPreference) =>
              setValues((current) => ({ ...current, lengthPreference }))
            }
            options={["short", "medium", "long", "endless"]}
          />
          <Field label="Optional deterministic seed" error={errors.seed}>
            <Input
              value={values.seed}
              onChange={(event) => setValues((current) => ({ ...current, seed: event.target.value }))}
              placeholder="spec-seed-01"
            />
          </Field>
          <label className="flex items-start gap-3 rounded-[1.35rem] border border-[color:var(--border)] bg-white/62 px-4 py-4 text-sm leading-6 shadow-[var(--shadow-soft)]">
            <input
              type="checkbox"
              checked={values.deterministic}
              onChange={(event) =>
                setValues((current) => ({ ...current, deterministic: event.target.checked }))
              }
              className="mt-1"
            />
            <span>
              <span className="block font-semibold">Deterministic mode</span>
              Use a repeatable seed for testing or debugging long session behavior.
            </span>
          </label>
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating session..." : "Create session"}
          </Button>
          <p className="text-center text-xs leading-5 text-black/48">
            Opening-scene generation happens after creation, so provider errors are shown
            on the story page if configuration or network access needs attention.
          </p>
        </div>
      </Card>
    </form>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-black/82">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-sm text-[#9c2f2f]">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <select
        className="w-full rounded-[1.2rem] border border-[color:var(--border)] bg-white/78 px-4 py-3 text-sm shadow-[var(--shadow-soft)] outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
