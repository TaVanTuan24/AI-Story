"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MagicalBackground } from "@/components/theme/magical-background";
import { FantasyGlowCard } from "@/components/theme/fantasy-glow-card";
import { api, ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { demoSeeds, type DemoSeed } from "@/features/story/demo-seeds";
import { formatGenerationError } from "@/features/story/generation-error";

const genres = [
  "fantasy",
  "mystery",
  "romance",
  "xianxia",
  "sci-fi",
  "horror",
  "historical",
  "politics",
  "school-life",
  "slice-of-life",
  "survival",
  "adventure",
  "drama",
  "custom",
];

export function CreateSessionForm() {
  const router = useRouter();
  const { token, preferences } = useAuth();
  const { push } = useToast();
  const { t } = useI18n();
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
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritePreview, setRewritePreview] = useState<null | {
    raw: string;
    parsed: {
      titleHint: string;
      premise: string;
      seedPrompt: string;
      suggestedGenre?: string;
      suggestedTone?: string;
      dynamicStatsPreview: Array<{
        key: string;
        label: string;
        description: string;
      }>;
    };
  }>(null);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const storyOutputLanguage =
    preferences?.storyOutputLanguage === "vi" ? "vi" : "en";
  const genreOptions = genres.map((genre) => ({
    value: genre,
    label: t(`create.options.genre.${genre}`, genre),
  }));
  const presetOptions = ["freeform", "rpg-lite", "mystery", "social-drama"].map(
    (option) => ({
      value: option,
      label: t(`create.options.enginePreset.${option}`, option),
    }),
  );
  const difficultyOptions = ["relaxed", "standard", "hard"].map((option) => ({
    value: option,
    label: t(`create.options.difficulty.${option}`, option),
  }));
  const lengthOptions = ["short", "medium", "long", "endless"].map(
    (option) => ({
      value: option,
      label: t(`create.options.lengthPreference.${option}`, option),
    }),
  );

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

  async function improveWithAi() {
    if (!token) {
      push({
        title: t("create.loginRequired"),
        description: t("create.loginRequiredDescription"),
        tone: "error",
      });
      router.replace("/login");
      return;
    }

    const rewriteInput = buildRewriteInput(values);
    if (rewriteInput.trim().length < 12) {
      setErrors((current) => ({
        ...current,
        premise: t(
          "create.validation.rewriteInput",
          "Add a stronger title, premise, or seed prompt before using AI rewrite.",
        ),
      }));
      return;
    }

    setIsRewriting(true);

    try {
      const result = await api.rewriteStoryIdea(token, rewriteInput);
      setRewritePreview({
        raw: result.rewrittenText,
        parsed: parseRewriteOutput(result, values),
      });
      push({
        title: t("create.rewriteReadyTitle", "AI rewrite ready"),
        description: t(
          "create.rewriteReadyDescription",
          "Review the improved story idea before applying it to the form.",
        ),
        tone: "success",
      });
    } catch (error) {
      push({
        title: t("create.rewriteFailedTitle", "AI rewrite failed"),
        description:
          error instanceof ApiClientError
            ? error.message
            : t("create.rewriteFailedDescription", "Please try again in a moment."),
        tone: "error",
      });
    } finally {
      setIsRewriting(false);
    }
  }

  function acceptRewrite() {
    if (!rewritePreview) {
      return;
    }

    setValues((current) => ({
      ...current,
      titleHint: rewritePreview.parsed.titleHint,
      premise: rewritePreview.parsed.premise,
      seedPrompt: rewritePreview.parsed.seedPrompt,
      genre: rewritePreview.parsed.suggestedGenre || current.genre,
      tone: rewritePreview.parsed.suggestedTone || current.tone,
    }));
    setRewritePreview(null);
    push({
      title: t("create.rewriteAppliedTitle", "AI rewrite applied"),
      description: t(
        "create.rewriteAppliedDescription",
        "The improved idea has been copied into your session form.",
      ),
      tone: "success",
    });
  }

  function rejectRewrite() {
    setRewritePreview(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (values.premise.trim().length < 12) {
      nextErrors.premise = t(
        "create.validation.premise",
        "Give the session a stronger premise.",
      );
    }
    if (values.tone.trim().length < 3) {
      nextErrors.tone = t("create.validation.tone", "Choose a stronger tone.");
    }
    if (values.seed.length > 120) {
      nextErrors.seed = t(
        "create.validation.seed",
        "Seed must be 120 characters or fewer.",
      );
    }
    if (values.titleHint.length > 120) {
      nextErrors.titleHint = t(
        "create.validation.titleHint",
        "Title hint must be 120 characters or fewer.",
      );
    }
    if (values.seedPrompt.length > 500) {
      nextErrors.seedPrompt = t(
        "create.validation.seedPrompt",
        "Seed prompt must be 500 characters or fewer.",
      );
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!token) {
      push({
        title: t("create.loginRequired"),
        description: t("create.loginRequiredDescription"),
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
        title: t("create.sessionCreated"),
        description: t("create.sessionReady"),
        tone: "success",
      });
      router.push(`/story-sessions/${session.id}`);
    } catch (error) {
      push({
        title: t("create.couldNotCreate"),
        description:
          error instanceof ApiClientError
            ? formatGenerationError(error, t).message
            : t("create.serverFailed"),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MagicalBackground intensity="soft" className="rounded-[2.5rem] p-1">
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_24rem]"
      onSubmit={onSubmit}
    >
      <FantasyGlowCard className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/80 to-transparent" />
        <p className="eyebrow-label text-xs font-semibold uppercase">
          {t("create.blueprint")}
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-semibold text-balance">
          {t("create.title")}
        </h1>
        <p className="text-ui-muted mt-4 max-w-2xl text-sm leading-7 sm:text-base">
          {t("create.description")}
        </p>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                {t("create.demoSeeds")}
              </p>
              <p className="text-ui-muted mt-2 text-sm leading-6">
                {t("create.demoDescription")}
              </p>
            </div>
            {selectedSeedId ? (
              <button
                type="button"
                className="text-sm font-semibold text-[color:var(--accent)] transition hover:text-[color:var(--text-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]"
                onClick={() => setSelectedSeedId(null)}
              >
                {t("create.selected")}
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
                  "rounded-[1.35rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition duration-200",
                  "hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--surface-selected)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none",
                  selectedSeedId === seed.id &&
                    "border-[color:var(--accent)] bg-[color:var(--surface-selected)] ring-2 ring-[color:var(--accent-soft)]",
                )}
              >
                <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {t(`create.demoSeedsCatalog.${seed.id}.label`, seed.label)}
                </span>
                <span className="text-ui-subtle mt-2 line-clamp-2 block text-xs leading-5">
                  {t(
                    `create.demoSeedsCatalog.${seed.id}.premise`,
                    seed.premise,
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 space-y-5">
          <Field label={t("create.titleHint")} error={errors.titleHint}>
            <Input
              value={values.titleHint}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  titleHint: event.target.value,
                }))
              }
              placeholder={t(
                "create.placeholders.titleHint",
                "The Lantern Beyond Ninth Street",
              )}
            />
          </Field>

          <Field label={t("create.premise")} error={errors.premise}>
            <Textarea
              value={values.premise}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  premise: event.target.value,
                }))
              }
              placeholder={t(
                "create.placeholders.premise",
                "A missing brother leaves messages that predict crimes one night before they happen.",
              )}
              className="min-h-40"
            />
          </Field>

          <Field label={t("create.seedPrompt")} error={errors.seedPrompt}>
            <Textarea
              value={values.seedPrompt}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  seedPrompt: event.target.value,
                }))
              }
              placeholder={t(
                "create.placeholders.seedPrompt",
                "A haunted university in 2090",
              )}
              className="min-h-24"
            />
          </Field>

          <div className="surface-panel rounded-[1.35rem] px-4 py-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {t("create.aiRewriteTitle", "Polish your story idea")}
                </p>
                <p className="text-ui-muted mt-2 text-sm leading-6">
                  {t(
                    "create.aiRewriteDescription",
                    "Send your title, premise, and seed prompt through the AI to sharpen the hook before you create the session.",
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={improveWithAi}
                disabled={isRewriting}
              >
                {isRewriting
                  ? t("create.rewritingIdea", "Đang cải thiện...")
                  : t("create.improveWithAi", "Cải thiện bằng AI")}
              </Button>
            </div>
          </div>

          {rewritePreview ? (
            <div className="surface-panel-strong rounded-[1.5rem] px-5 py-5 shadow-[var(--shadow-soft)]">
              <p className="text-ui-subtle text-xs font-semibold tracking-[0.24em] uppercase">
                {t("create.rewritePreviewEyebrow", "AI rewrite preview")}
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                    {t("create.titleHint")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">
                    {rewritePreview.parsed.titleHint || t("create.rewriteEmptyField", "No change")}
                  </p>
                </div>
                <div>
                  <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                    {t("create.premise")}
                  </p>
                  <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-[color:var(--text-primary)]">
                    {rewritePreview.parsed.premise}
                  </p>
                </div>
                <div>
                  <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                    {t("create.genre")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">
                    {rewritePreview.parsed.suggestedGenre
                      ? t(
                          `create.options.genre.${rewritePreview.parsed.suggestedGenre}`,
                          rewritePreview.parsed.suggestedGenre,
                        )
                      : t("create.rewriteEmptyField", "No change")}
                  </p>
                </div>
                <div>
                  <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                    {t("create.tone")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">
                    {rewritePreview.parsed.suggestedTone || t("create.rewriteEmptyField", "No change")}
                  </p>
                </div>
                <div>
                  <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                    {t("create.seedPrompt")}
                  </p>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[color:var(--text-primary)]">
                    {rewritePreview.parsed.seedPrompt || t("create.rewriteEmptyField", "No change")}
                  </p>
                </div>
                {rewritePreview.parsed.dynamicStatsPreview.length > 0 ? (
                  <div>
                    <p className="text-ui-faint text-[11px] tracking-[0.22em] uppercase">
                      {t("create.dynamicStatsPreview", "Dynamic stats preview")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {rewritePreview.parsed.dynamicStatsPreview.map((item) => (
                        <div
                          key={item.key}
                          className="surface-panel rounded-[1.2rem] px-4 py-4 shadow-[var(--shadow-soft)]"
                        >
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                            {item.label}
                          </p>
                          <p className="text-ui-muted mt-2 text-sm leading-6">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="button" onClick={acceptRewrite}>
                  {t("create.acceptRewrite", "Accept rewrite")}
                </Button>
                <Button type="button" variant="secondary" onClick={rejectRewrite}>
                  {t("create.rejectRewrite", "Reject")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </FantasyGlowCard>

      <Card className="p-6 sm:p-8 lg:sticky lg:top-24 lg:self-start">
        <p className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
          {t("create.controls")}
        </p>
        <p className="text-ui-muted mt-3 text-sm leading-6">
          {t("create.controlsDescription")}
        </p>
        <div className="mt-6 space-y-4">
          <div className="surface-panel rounded-[1.35rem] px-4 py-4 shadow-[var(--shadow-soft)]">
            <p className="text-ui-faint text-xs font-semibold tracking-[0.24em] uppercase">
              {t("settings.storyOutputLanguage")}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-ui-muted text-sm leading-6">
                {t(
                  "create.storyLanguageNoticePrefix",
                  "New sessions will generate player-facing story text in",
                )}{" "}
                <span className="font-semibold">
                  {storyOutputLanguage === "vi"
                    ? t("common.vietnamese")
                    : t("common.english")}
                </span>
                {t("create.storyLanguageNoticeSuffix", ".")}
              </p>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-selected)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[color:var(--text-secondary)] uppercase">
                {storyOutputLanguage}
              </span>
            </div>
          </div>
          <SelectField
            label={t("create.genre")}
            value={values.genre}
            onChange={(genre) =>
              setValues((current) => ({ ...current, genre }))
            }
            options={genreOptions}
          />
          <Field label={t("create.tone")} error={errors.tone}>
            <Input
              value={values.tone}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  tone: event.target.value,
                }))
              }
              placeholder={t(
                "create.placeholders.tone",
                "romantic and volatile",
              )}
            />
          </Field>
          <SelectField
            label={t("create.enginePreset")}
            value={values.enginePreset}
            onChange={(enginePreset) =>
              setValues((current) => ({ ...current, enginePreset }))
            }
            options={presetOptions}
          />
          <SelectField
            label={t("create.difficulty")}
            value={values.difficulty}
            onChange={(difficulty) =>
              setValues((current) => ({ ...current, difficulty }))
            }
            options={difficultyOptions}
          />
          <SelectField
            label={t("create.lengthPreference")}
            value={values.lengthPreference}
            onChange={(lengthPreference) =>
              setValues((current) => ({ ...current, lengthPreference }))
            }
            options={lengthOptions}
          />
          <Field label={t("create.deterministicSeed")} error={errors.seed}>
            <Input
              value={values.seed}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  seed: event.target.value,
                }))
              }
              placeholder={t("create.placeholders.seed", "spec-seed-01")}
            />
          </Field>
          <label className="surface-panel flex items-start gap-3 rounded-[1.35rem] px-4 py-4 text-sm leading-6 shadow-[var(--shadow-soft)]">
            <input
              type="checkbox"
              checked={values.deterministic}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  deterministic: event.target.checked,
                }))
              }
              className="mt-1"
            />
            <span>
              <span className="block font-semibold">
                {t("create.deterministicMode")}
              </span>
              {t("create.deterministicHelp")}
            </span>
          </label>
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t("create.creatingSession")
              : t("create.createSession")}
          </Button>
          <p className="text-ui-faint text-center text-xs leading-5">
            {t("create.providerNote")}
          </p>
        </div>
      </Card>
    </form>
    </MagicalBackground>
  );
}

function buildRewriteInput(values: {
  titleHint: string;
  premise: string;
  seedPrompt: string;
}) {
  return [
    `Title: ${values.titleHint.trim() || "(none yet)"}`,
    `Premise: ${values.premise.trim() || "(none yet)"}`,
    `Seed Prompt: ${values.seedPrompt.trim() || "(none yet)"}`,
    "",
    "Rewrite this into a stronger session concept while keeping the same core idea.",
    "Return the result with the same three labels: Title, Premise, Seed Prompt.",
  ].join("\n");
}

function parseRewriteOutput(
  result: {
    rewrittenText: string;
    suggestedGenre?: string;
    suggestedTone?: string;
    dynamicStatsPreview?: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  },
  fallback: {
    titleHint: string;
    premise: string;
    seedPrompt: string;
    genre: string;
    tone: string;
  },
) {
  const rewrittenText = result.rewrittenText;
  const titleHint = extractSectionValue(
    rewrittenText,
    /title\s*:\s*([\s\S]*?)(?=\n(?:premise|seed prompt)\s*:|$)/i,
  );
  const premise = extractSectionValue(
    rewrittenText,
    /premise\s*:\s*([\s\S]*?)(?=\n(?:title|seed prompt)\s*:|$)/i,
  );
  const seedPrompt = extractSectionValue(
    rewrittenText,
    /seed prompt\s*:\s*([\s\S]*?)(?=\n(?:title|premise)\s*:|$)/i,
  );

  return {
    titleHint: titleHint || fallback.titleHint,
    premise: premise || rewrittenText.trim() || fallback.premise,
    seedPrompt: seedPrompt || fallback.seedPrompt,
    suggestedGenre: result.suggestedGenre || fallback.genre,
    suggestedTone: result.suggestedTone || fallback.tone,
    dynamicStatsPreview: result.dynamicStatsPreview ?? [],
  };
}

function extractSectionValue(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? "";
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
      <span className="mb-2 block text-sm font-semibold text-[color:var(--text-secondary)]">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm text-[color:var(--danger-strong)]">
          {error}
        </span>
      ) : null}
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
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <select
        className="control-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
