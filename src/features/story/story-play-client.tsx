"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import { MagicalBackground } from "@/components/theme/magical-background";
import { FantasyGlowCard } from "@/components/theme/fantasy-glow-card";
import type {
  HistoryResponse,
  RecapResponse,
  SessionDetail,
  TurnResponse,
} from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { formatGenerationError } from "@/features/story/generation-error";

type ReplayAction =
  | { type: "choice"; value: string }
  | { type: "custom"; value: string }
  | null;

export function StoryPlayClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { push } = useToast();
  const { t } = useI18n();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [history, setHistory] = useState<HistoryResponse>([]);
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [customAction, setCustomAction] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    tone: "saved" | "saving" | "loading" | "error";
    label: string;
  }>({ tone: "saved", label: t("play.ready") });
  const [lastAction, setLastAction] = useState<ReplayAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<"start" | "turn" | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .getSession(token, params.id)
      .then((data) => {
        setSession(data);
        setStatus({
          tone: data.currentTurn > 0 ? "saved" : "loading",
          label: data.currentTurn > 0 ? t("play.autosaved") : t("play.awaitingStart"),
        });
      })
      .catch((error) => {
        const message =
          error instanceof ApiClientError
            ? error.message
            : t("play.errors.loadSessionFailed", "Could not load session.");
        setErrorMessage(message);
      })
      .finally(() => setIsLoading(false));
  }, [params.id, t, token]);

  useEffect(() => {
    if (!isGenerating || !generationMode) {
      return;
    }

    const stages =
      generationMode === "start"
        ? [
            t("play.loadingStages.world", "Creating world..."),
            t("play.loadingStages.characters", "Generating characters..."),
            t("play.loadingStages.opening", "Writing opening scene..."),
          ]
        : [
            t("play.loadingStages.interpret", "Interpreting action..."),
            t("play.loadingStages.nextScene", "Writing next scene..."),
            t("play.loadingStages.consistency", "Checking continuity..."),
          ];
    const intervalId = setInterval(() => {
      setStatus((current) => {
        const currentIndex = stages.indexOf(current.label);
        const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, stages.length - 1);
        return {
          tone: "loading",
          label: stages[nextIndex],
        };
      });
    }, 1800);

    return () => clearInterval(intervalId);
  }, [generationMode, isGenerating, t]);

  async function startSession() {
    if (!token) {
      return;
    }

    setIsGenerating(true);
    setGenerationMode("start");
    setStatus({
      tone: "loading",
      label: t("play.loadingStages.world", "Creating world..."),
    });
    setErrorMessage(null);

    try {
      const data = await api.startSession(token, params.id);
      setSession(data);
      setStatus({ tone: "saved", label: t("play.autosavedNow") });
      push({
        title: t("play.sessionStarted"),
        description: t("play.startedDescription"),
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? formatGenerationError(error, t).message
          : t("play.errors.openingFailed");
      setErrorMessage(message);
      setStatus({ tone: "error", label: t("play.generationFailed") });
    } finally {
      setIsGenerating(false);
      setGenerationMode(null);
    }
  }

  async function submitChoice(choiceId: string) {
    if (session?.gameOver) {
      return;
    }
    setActiveChoiceId(choiceId);
    await runTurn({ type: "choice", value: choiceId });
  }

  async function submitCustomAction() {
    if (session?.gameOver || !customAction.trim()) {
      return;
    }
    setActiveChoiceId(null);
    await runTurn({ type: "custom", value: customAction.trim() });
  }

  async function runTurn(action: ReplayAction) {
    if (!token || !action) {
      return;
    }

    setIsGenerating(true);
    setGenerationMode("turn");
    setLastAction(action);
    setStatus({
      tone: "loading",
      label:
        action.type === "custom"
          ? t("play.loadingStages.interpret", "Interpreting action...")
          : t("play.loadingStages.nextScene", "Writing next scene..."),
    });
    setErrorMessage(null);

    try {
      const result: TurnResponse =
        action.type === "choice"
          ? await api.submitChoice(token, params.id, action.value)
          : await api.submitCustomAction(token, params.id, action.value);

      setSession(result.session);
      setCustomAction("");
      setStatus({ tone: "saved", label: t("play.autosavedNow") });
      push({
        title: t("play.turnCompleteTitle", "Turn {turn} complete").replace(
          "{turn}",
          String(result.turn.turnNumber),
        ),
        description: t("play.nextSceneReady"),
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? formatGenerationError(error, t).message
          : t("play.errors.turnFailed");
      setErrorMessage(message);
      setStatus({ tone: "error", label: t("play.generationFailed") });
      push({
        title: t("play.turnFailed"),
        description: message,
        tone: "error",
      });
    } finally {
      setIsGenerating(false);
      setGenerationMode(null);
      setActiveChoiceId(null);
    }
  }

  async function openHistory() {
    if (!token) {
      return;
    }

    try {
      const result = await api.getHistory(token, params.id);
      setHistory(result);
      setHistoryOpen(true);
    } catch (error) {
      push({
        title: t("play.historyFailed"),
        description:
          error instanceof ApiClientError
            ? error.message
            : t("play.errors.historyLoadFailed", "History could not be loaded."),
        tone: "error",
      });
    }
  }

  async function openRecap() {
    if (!token) {
      return;
    }

    try {
      const result = await api.getRecap(token, params.id);
      setRecap(result);
      setRecapOpen(true);
    } catch (error) {
      push({
        title: t("play.recapFailed"),
        description:
          error instanceof ApiClientError
            ? error.message
            : t("play.errors.recapLoadFailed", "Recap could not be loaded."),
        tone: "error",
      });
    }
  }

  async function manualSave() {
    if (!token) {
      return;
    }

    setStatus({ tone: "saving", label: t("common.saving") });

    try {
      const saved = await api.saveSession(token, params.id);
      setSession((current) => (current ? { ...current, ...saved } : current));
      setStatus({
        tone: "saved",
        label: t("play.savedJustNow", "Saved just now"),
      });
      push({
        title: t("play.progressSaved"),
        description: t("play.progressSavedDescription"),
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : t("play.saveFailed");
      setStatus({ tone: "error", label: t("play.saveFailed") });
      push({
        title: t("play.couldNotSave"),
        description: message,
        tone: "error",
      });
    }
  }

  if (isLoading) {
    return (
      <SiteShell>
        <RequireAuth>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_22rem]">
            <Card className="overflow-hidden p-7 sm:p-8 md:p-10">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <div className="animate-shimmer h-7 w-20 rounded-full bg-white/65" />
                  <div className="animate-shimmer h-7 w-16 rounded-full bg-white/60" />
                  <div className="animate-shimmer h-7 w-24 rounded-full bg-white/60" />
                </div>
                <div className="animate-shimmer h-12 w-3/4 rounded-[1.5rem] bg-white/60" />
                <div className="animate-shimmer h-5 w-1/3 rounded-full bg-white/55" />
                <div className="rounded-[2rem] bg-[#1f1b16] px-7 py-8 md:px-9 md:py-10">
                  <div className="space-y-4">
                    <div className="animate-shimmer h-4 w-40 rounded-full bg-white/15" />
                    <div className="animate-shimmer h-5 w-full rounded-full bg-white/15" />
                    <div className="animate-shimmer h-5 w-full rounded-full bg-white/10" />
                    <div className="animate-shimmer h-5 w-11/12 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </Card>
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="animate-shimmer h-40">
                  <div />
                </Card>
              ))}
            </div>
          </div>
        </RequireAuth>
      </SiteShell>
    );
  }

  if (!session) {
    return (
      <SiteShell>
        <RequireAuth>
          <EmptyState
            eyebrow={t("play.missingSession")}
            title={t("play.missingSessionTitle")}
            description={t("play.missingSessionDescription")}
            actionLabel={t("play.backDashboard")}
            onAction={() => router.push("/dashboard")}
          />
        </RequireAuth>
      </SiteShell>
    );
  }

  const dynamicStats = session.dynamicStats ?? [];
  const relationshipStates = session.relationships ?? [];
  const abilities = session.abilities ?? [];
  const worldMemory = session.worldMemory ?? [];

  return (
    <SiteShell>
      <RequireAuth>
        <MagicalBackground className="rounded-[2.75rem] p-1">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_22rem]">
          <div className="space-y-6">
            <FantasyGlowCard className="relative overflow-hidden p-6 sm:p-8 md:p-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/80 to-transparent" />
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{session.genre}</Badge>
                <Badge>{session.tone}</Badge>
                <Badge>{session.enginePreset}</Badge>
                <Badge>
                  {t("play.storyLanguageLabel", "Story language")}:{" "}
                  {session.storyOutputLanguage === "vi"
                    ? t("common.vietnamese")
                    : t("common.english")}
                </Badge>
                {session.difficulty ? <Badge>{session.difficulty}</Badge> : null}
                <StatusPill tone={status.tone} label={status.label} />
              </div>

              <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="eyebrow-label text-xs font-semibold uppercase">
                    {t("play.currentSession")}
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold text-balance sm:text-5xl">
                    {session.title}
                  </h1>
                  <p className="text-ui-muted mt-4 text-sm leading-7 sm:text-base">
                    {t("play.turnLabel", "Turn {turn}").replace(
                      "{turn}",
                      String(session.currentTurn),
                    )}{" "}
                    - {session.latestSceneTitle ?? t("play.waitingOpening")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={manualSave} disabled={isGenerating}>
                    {t("common.save")}
                  </Button>
                  <Button variant="secondary" onClick={openRecap} disabled={isGenerating}>
                    {t("play.recap")}
                  </Button>
                  <Button variant="secondary" onClick={openHistory} disabled={isGenerating}>
                    {t("play.history")}
                  </Button>
                </div>
              </div>

              <div className="surface-panel mt-6 flex flex-wrap items-center gap-3 rounded-[1.5rem] px-4 py-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      status.tone === "error"
                        ? "bg-[color:var(--danger)]"
                        : status.tone === "loading" || status.tone === "saving"
                          ? "bg-[color:var(--warning)]"
                          : "bg-[color:var(--success)]",
                    )}
                  />
                  <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
                    {status.label}
                  </p>
                </div>
                <p className="text-ui-subtle text-sm">
                  {isGenerating ? t("play.draftingHelp") : t("play.autosaveHelp")}
                </p>
              </div>

              {errorMessage ? (
                <div className="themed-error-panel mt-6 rounded-[1.6rem] px-5 py-5 shadow-[var(--shadow-soft)]">
                  <p className="text-sm font-semibold tracking-[0.24em] uppercase">
                    {t("play.generationIssue")}
                  </p>
                  <p className="mt-3 text-sm leading-7">{errorMessage}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {lastAction ? (
                      <Button
                        variant="danger"
                        onClick={() => runTurn(lastAction)}
                        disabled={isGenerating}
                      >
                        {t("play.retryLast")}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => router.push("/profile")}
                      disabled={isGenerating}
                    >
                      {t("play.openAiSettings", "Open AI settings")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {!session.currentScene ? (
                <div className="mt-8">
                  <EmptyState
                    eyebrow={t("play.sessionReadyEyebrow")}
                    title={t("play.sessionReadyTitle")}
                    description={t("play.sessionReadyDescription")}
                    actionLabel={isGenerating ? t("play.generating") : t("play.startSession")}
                    onAction={startSession}
                  />
                </div>
              ) : (
                <>
                  <article className="grain-overlay themed-prose-panel relative mt-8 overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 md:px-10 md:py-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)]" />
                    <div className="relative flex flex-wrap items-center gap-3">
                      <p className="text-xs font-semibold tracking-[0.3em] text-[color:var(--accent-strong)] uppercase">
                        {session.currentScene.title}
                      </p>
                      {session.currentScene.risk ? (
                        <span className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)]/35 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[color:var(--text-secondary)] uppercase">
                          {t("play.riskLabel", "Risk")}:{" "}
                          {t(`play.risk.${session.currentScene.risk}`, session.currentScene.risk)}
                        </span>
                      ) : null}
                      {session.currentScene.outcome ? (
                        <span className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)]/35 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[color:var(--text-secondary)] uppercase">
                          {t("play.outcomeLabel", "Outcome")}:{" "}
                          {t(
                            `play.outcome.${session.currentScene.outcome}`,
                            session.currentScene.outcome,
                          )}
                        </span>
                      ) : null}
                      {typeof session.currentScene.roll === "number" ? (
                        <span className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)]/35 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[color:var(--text-secondary)] uppercase">
                          {t("play.rollLabel", "Roll")}: {session.currentScene.roll}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative mt-5 text-base leading-8 whitespace-pre-wrap text-[color:var(--text-secondary)] sm:text-lg sm:leading-9">
                      {session.currentScene.body}
                    </div>
                  </article>

                  {session.gameOver ? (
                    <Card className="mt-6 border-[color:var(--danger)] bg-[color:var(--surface-strong)] p-5 sm:p-6">
                      <p className="text-sm font-semibold tracking-[0.22em] text-[color:var(--danger-strong)] uppercase">
                        {t("play.gameOverEyebrow", "Game over")}
                      </p>
                      <p className="mt-3 text-base leading-7 text-[color:var(--text-primary)]">
                        {t(
                          "play.gameOverDescription",
                          "This session has reached an ending. The world will not generate further choices for this run.",
                        )}
                      </p>
                    </Card>
                  ) : null}

                  <section className="mt-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="eyebrow-label text-xs font-semibold tracking-[0.28em] uppercase">
                          {t("play.chooseNext")}
                        </p>
                        <p className="text-ui-muted mt-2 text-sm leading-6">
                          {session.gameOver
                            ? t(
                                "play.choiceLockedHelp",
                                "Choices are locked because this story has already reached its ending.",
                              )
                            : t("play.choiceHelp")}
                        </p>
                      </div>
                      {isGenerating ? (
                        <p className="animate-fade-up text-sm font-semibold text-[color:var(--text-subtle)]">
                          {t("play.draftingNext")}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-5 space-y-4">
                      {session.currentScene.choices.map((choice, index) => {
                        const isActive = activeChoiceId === choice.id && isGenerating;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            disabled={isGenerating || session.gameOver}
                            onClick={() => submitChoice(choice.id)}
                            className={cn(
                              "group w-full rounded-[1.7rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-5 py-5 text-left shadow-[var(--shadow-soft)] transition duration-200",
                              "hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--surface-selected)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] focus-visible:outline-none",
                              "disabled:cursor-not-allowed disabled:opacity-70",
                              isActive &&
                                "border-[color:var(--accent)] bg-[color:var(--surface-selected)] ring-2 ring-[color:var(--accent-soft)]",
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-selected)] text-sm font-semibold text-[color:var(--text-secondary)]">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-base font-semibold text-[color:var(--text-primary)]">
                                    {choice.label}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {choice.risk ? (
                                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-selected)] px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[color:var(--text-secondary)] uppercase">
                                        {t(`play.risk.${choice.risk}`, choice.risk)}
                                      </span>
                                    ) : null}
                                    <span className="text-ui-faint text-[11px] font-semibold tracking-[0.24em] uppercase">
                                      {isActive ? t("play.generating") : t("play.choice")}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-ui-faint mt-2 text-xs tracking-[0.24em] uppercase">
                                  {choice.intent}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <Card className="mt-6 p-5 sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-[color:var(--text-primary)]">
                          {t("play.customAction")}
                        </p>
                        <p className="text-ui-muted mt-1 text-sm leading-6">
                          {t("play.customHelp")}
                        </p>
                      </div>
                      <Badge>{t("play.moderated")}</Badge>
                    </div>
                    <label className="mt-4 block">
                      <span className="sr-only">{t("play.customAction")}</span>
                      <Textarea
                        className="min-h-32"
                        value={customAction}
                        onChange={(event) => setCustomAction(event.target.value)}
                        placeholder={t("play.customPlaceholder")}
                        disabled={isGenerating || session.gameOver}
                      />
                    </label>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-ui-subtle text-sm leading-6">{t("play.safetyHelp")}</p>
                      <Button
                        onClick={submitCustomAction}
                        disabled={isGenerating || session.gameOver || !customAction.trim()}
                      >
                        {isGenerating && !activeChoiceId
                          ? t("play.generating")
                          : t("play.submitAction")}
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </FantasyGlowCard>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5 sm:p-6">
              <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                {t("play.sessionOverview")}
              </h2>
              <dl className="mt-5 space-y-4 text-sm">
                <MetaRow label={t("create.genre")} value={session.genre} />
                <MetaRow label={t("create.tone")} value={session.tone} />
                <MetaRow label={t("play.presetLabel", "Preset")} value={session.enginePreset} />
                <MetaRow
                  label={t("play.storyLanguageLabel", "Story language")}
                  value={
                    session.storyOutputLanguage === "vi"
                      ? t("common.vietnamese")
                      : t("common.english")
                  }
                />
                <MetaRow
                  label={t("play.currentTurnLabel", "Current turn")}
                  value={String(session.currentTurn)}
                />
                {session.coreState?.currentArc ? (
                  <MetaRow
                    label={t("play.currentArcLabel", "Current arc")}
                    value={session.coreState.currentArc}
                  />
                ) : null}
                {session.lastChoice ? (
                  <MetaRow
                    label={t("play.lastChoiceLabel", "Last choice")}
                    value={session.lastChoice}
                  />
                ) : null}
              </dl>
            </Card>

            {dynamicStats.length > 0 ? (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                    {t("play.dynamicStatsLabel", "Story state")}
                  </h2>
                  <Badge>{dynamicStats.length}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {dynamicStats.map((stat) => (
                    <div
                      key={stat.key}
                      className="surface-panel rounded-[1.35rem] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <p className="text-ui-faint text-[11px] tracking-[0.2em] uppercase">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">
                        {stat.value}
                      </p>
                      <p className="text-ui-muted mt-2 text-sm leading-6">
                        {stat.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {(session.inventory?.length ?? 0) > 0 ? (
              <Card className="p-5 sm:p-6">
                <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                  {t("play.inventoryLabel", "Inventory")}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.inventory!.map((item) => (
                    <Badge key={item.id}>
                      {item.label} x{item.quantity}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            {abilities.length > 0 ? (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                    {t("play.abilitiesLabel", "Abilities")}
                  </h2>
                  <Badge>{abilities.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {abilities.map((ability) => (
                    <div
                      key={ability.id}
                      className="surface-panel rounded-[1.35rem] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[color:var(--text-primary)]">
                            {ability.label}
                          </p>
                          <p className="text-ui-muted mt-2 text-sm leading-6">
                            {ability.description}
                          </p>
                        </div>
                        {typeof ability.charges === "number" ? <Badge>{ability.charges}</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {relationshipStates.length > 0 ? (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                    {t("play.relationshipPanelLabel", "Relationships")}
                  </h2>
                  <Badge>{relationshipStates.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {relationshipStates.map((relationship) => (
                    <div
                      key={relationship.characterId}
                      className="surface-panel rounded-[1.35rem] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[color:var(--text-primary)]">
                            {relationship.name}
                          </p>
                          <p className="text-ui-muted text-sm">{relationship.role}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <StatPill label={t("play.affinityLabel", "Affinity")} value={relationship.affinity} />
                        <StatPill label={t("play.trustLabel", "Trust")} value={relationship.trust} />
                        <StatPill label={t("play.conflictLabel", "Conflict")} value={relationship.conflict} />
                      </div>
                      {relationship.notes ? (
                        <p className="text-ui-muted mt-3 text-sm leading-6">{relationship.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : session.characters.length > 0 ? (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                    {t("play.knownCharacters")}
                  </h2>
                  <Badge>{session.characters.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {session.characters.map((character) => (
                    <div
                      key={character.id}
                      className="surface-panel rounded-[1.35rem] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[color:var(--text-primary)]">
                            {character.name}
                          </p>
                          <p className="text-ui-muted text-sm">{character.role}</p>
                        </div>
                        <Badge>{character.relationshipBucket}</Badge>
                      </div>
                      <p className="text-ui-faint mt-3 text-xs tracking-[0.2em] uppercase">
                        {t("play.relationshipScoreLabel", "Relationship score")} -{" "}
                        {character.relationshipScore}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {worldMemory.length > 0 ? (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                    {t("play.worldMemoryLabel", "World memory")}
                  </h2>
                  <Badge>{worldMemory.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {worldMemory.slice(-4).reverse().map((entry) => (
                    <div
                      key={entry.id}
                      className="surface-panel rounded-[1.35rem] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <p className="text-ui-faint text-[11px] tracking-[0.2em] uppercase">
                        {entry.kind} -{" "}
                        {t("play.turnLabel", "Turn {turn}").replace(
                          "{turn}",
                          String(entry.turnNumber),
                        )}
                      </p>
                      <p className="text-ui-secondary mt-2 text-sm leading-6">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-5 sm:p-6">
              <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                {t("play.recapNotes")}
              </h2>
              <p className="text-ui-secondary mt-4 text-sm leading-7">
                {session.canonicalState?.sceneSummary ??
                  session.currentSceneSummary ??
                  t(
                    "play.recapPending",
                    "The session recap will appear here after the first turn.",
                  )}
              </p>
            </Card>
          </div>
        </div>
        </MagicalBackground>

        {historyOpen ? (
          <Panel
            title={t("play.turnHistory")}
            description={t("play.turnHistoryDescription")}
            onClose={() => setHistoryOpen(false)}
          >
            {history.length > 0 ? (
              history.map((turn) => (
                <div
                  key={`${turn.turnNumber}-${turn.sceneTitle}`}
                  className="surface-panel-strong rounded-[1.5rem] p-5 shadow-[var(--shadow-soft)]"
                >
                  <p className="eyebrow-label text-xs tracking-[0.24em] uppercase">
                    {t("play.turnLabel", "Turn {turn}").replace(
                      "{turn}",
                      String(turn.turnNumber),
                    )}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
                    {turn.sceneTitle ?? t("play.untitledScene", "Untitled scene")}
                  </p>
                  <p className="text-ui-secondary mt-3 text-sm leading-7">{turn.sceneSummary}</p>
                  <p className="text-ui-faint mt-4 text-xs tracking-[0.22em] uppercase">
                    {t("play.actionLabel", "Action")} - {turn.chosenAction}
                  </p>
                </div>
              ))
            ) : (
              <div className="surface-empty rounded-[1.5rem] px-5 py-8 text-sm leading-6">
                {t(
                  "play.noHistory",
                  "No turn history is available yet. Start the session and make a choice to begin recording the trail.",
                )}
              </div>
            )}
          </Panel>
        ) : null}

        {recapOpen && recap ? (
          <Panel
            title={t("play.sessionRecap")}
            description={t("play.recapDescription")}
            onClose={() => setRecapOpen(false)}
          >
            <div className="surface-panel-strong rounded-[1.6rem] p-5 shadow-[var(--shadow-soft)]">
              <p className="text-ui-secondary text-sm leading-7">{recap.recap}</p>
            </div>
            <section>
              <p className="text-ui-faint text-xs font-semibold tracking-[0.24em] uppercase">
                {t("play.highlights")}
              </p>
              <div className="mt-3 space-y-3">
                {recap.highlights.length > 0 ? (
                  recap.highlights.map((item) => (
                    <div
                      key={item}
                      className="surface-panel-strong rounded-[1.4rem] px-4 py-4 text-sm leading-6 shadow-[var(--shadow-soft)]"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="surface-empty rounded-[1.4rem] px-4 py-5 text-sm">
                    {t("play.noHighlights", "No recap highlights were generated yet.")}
                  </div>
                )}
              </div>
            </section>
            <section>
              <p className="text-ui-faint text-xs font-semibold tracking-[0.24em] uppercase">
                {t("play.openThreads")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recap.openThreads.length > 0 ? (
                  recap.openThreads.map((item) => <Badge key={item}>{item}</Badge>)
                ) : (
                  <p className="text-ui-subtle text-sm">
                    {t("play.noOpenThreads", "No open threads were highlighted.")}
                  </p>
                )}
              </div>
            </section>
          </Panel>
        ) : null}
      </RequireAuth>
    </SiteShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[color:var(--text-subtle)]">{label}</dt>
      <dd className="text-right font-semibold text-[color:var(--text-secondary)]">{value}</dd>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-selected)] px-3 py-3 text-center">
      <p className="text-ui-faint text-[11px] tracking-[0.2em] uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">{value}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[color:var(--surface-dark)]/45 backdrop-blur-md">
      <div className="themed-modal-surface flex h-full w-full max-w-2xl flex-col border-l border-[color:var(--border)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] pb-5">
          <div>
            <p className="eyebrow-label text-xs font-semibold uppercase">{t("play.memoryView")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">
              {title}
            </h2>
            <p className="text-ui-muted mt-2 max-w-xl text-sm leading-6">{description}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
