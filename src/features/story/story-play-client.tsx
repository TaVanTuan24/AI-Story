"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Textarea } from "@/components/ui/textarea";
import type {
  HistoryResponse,
  RecapResponse,
  SessionDetail,
  TurnResponse,
} from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

type ReplayAction =
  | { type: "choice"; value: string }
  | { type: "custom"; value: string }
  | null;

export function StoryPlayClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { push } = useToast();

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
  }>({ tone: "saved", label: "Ready" });
  const [lastAction, setLastAction] = useState<ReplayAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          label: data.currentTurn > 0 ? "Autosaved" : "Awaiting start",
        });
      })
      .catch((error) => {
        const message =
          error instanceof ApiClientError ? error.message : "Could not load session.";
        setErrorMessage(message);
      })
      .finally(() => setIsLoading(false));
  }, [params.id, token]);

  async function startSession() {
    if (!token) {
      return;
    }

    setIsGenerating(true);
    setStatus({ tone: "loading", label: "Generating opening..." });
    setErrorMessage(null);

    try {
      const data = await api.startSession(token, params.id);
      setSession(data);
      setStatus({ tone: "saved", label: "Autosaved just now" });
      push({
        title: "Session started",
        description: "World, cast, opening scene, and choices are ready.",
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Opening generation failed.";
      setErrorMessage(message);
      setStatus({ tone: "error", label: "Generation failed" });
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitChoice(choiceId: string) {
    setActiveChoiceId(choiceId);
    await runTurn({ type: "choice", value: choiceId });
  }

  async function submitCustomAction() {
    if (!customAction.trim()) {
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
    setLastAction(action);
    setStatus({ tone: "loading", label: "Generating next turn..." });
    setErrorMessage(null);

    try {
      const result: TurnResponse =
        action.type === "choice"
          ? await api.submitChoice(token, params.id, action.value)
          : await api.submitCustomAction(token, params.id, action.value);

      setSession(result.session);
      setCustomAction("");
      setStatus({ tone: "saved", label: "Autosaved just now" });
      push({
        title: `Turn ${result.turn.turnNumber} complete`,
        description: "The next scene is ready.",
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Turn generation failed.";
      setErrorMessage(message);
      setStatus({ tone: "error", label: "Generation failed" });
      push({
        title: "Turn failed",
        description: message,
        tone: "error",
      });
    } finally {
      setIsGenerating(false);
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
        title: "Could not load history",
        description:
          error instanceof ApiClientError ? error.message : "History could not be loaded.",
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
        title: "Could not load recap",
        description:
          error instanceof ApiClientError ? error.message : "Recap could not be loaded.",
        tone: "error",
      });
    }
  }

  async function manualSave() {
    if (!token) {
      return;
    }

    setStatus({ tone: "saving", label: "Saving..." });

    try {
      const saved = await api.saveSession(token, params.id);
      setSession((current) => (current ? { ...current, ...saved } : current));
      setStatus({ tone: "saved", label: "Saved just now" });
      push({
        title: "Progress saved",
        description: "This session is safely stored and ready to resume.",
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Save failed.";
      setStatus({ tone: "error", label: "Save failed" });
      push({
        title: "Could not save session",
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
                  <div className="h-7 w-20 animate-shimmer rounded-full bg-white/65" />
                  <div className="h-7 w-16 animate-shimmer rounded-full bg-white/60" />
                  <div className="h-7 w-24 animate-shimmer rounded-full bg-white/60" />
                </div>
                <div className="h-12 w-3/4 animate-shimmer rounded-[1.5rem] bg-white/60" />
                <div className="h-5 w-1/3 animate-shimmer rounded-full bg-white/55" />
                <div className="rounded-[2rem] bg-[#1f1b16] px-7 py-8 md:px-9 md:py-10">
                  <div className="space-y-4">
                    <div className="h-4 w-40 animate-shimmer rounded-full bg-white/15" />
                    <div className="h-5 w-full animate-shimmer rounded-full bg-white/15" />
                    <div className="h-5 w-full animate-shimmer rounded-full bg-white/10" />
                    <div className="h-5 w-11/12 animate-shimmer rounded-full bg-white/10" />
                    <div className="h-5 w-4/5 animate-shimmer rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-shimmer rounded-[1.6rem] bg-white/60"
                    />
                  ))}
                </div>
              </div>
            </Card>
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="h-40 animate-shimmer">
                  <div />
                </Card>
              ))}
            </div>
          </div>
        </RequireAuth>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <RequireAuth>
        {session ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_22rem]">
            <div className="space-y-6">
              <Card className="relative overflow-hidden p-6 sm:p-8 md:p-10">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/80 to-transparent" />
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>{session.genre}</Badge>
                  <Badge>{session.tone}</Badge>
                  <Badge>{session.enginePreset}</Badge>
                  {session.difficulty ? <Badge>{session.difficulty}</Badge> : null}
                  <StatusPill tone={status.tone} label={status.label} />
                </div>

                <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
                      Current Session
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold leading-tight text-balance sm:text-5xl">
                      {session.title}
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
                      Turn {session.currentTurn} · {session.latestSceneTitle ?? "Waiting for the opening scene"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={manualSave} disabled={isGenerating}>
                      Save
                    </Button>
                    <Button variant="secondary" onClick={openRecap} disabled={isGenerating}>
                      Recap
                    </Button>
                    <Button variant="secondary" onClick={openHistory} disabled={isGenerating}>
                      History
                    </Button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[color:var(--border)] bg-white/58 px-4 py-4 shadow-[var(--shadow-soft)]">
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
                    <p className="text-sm font-semibold text-black/78">{status.label}</p>
                  </div>
                  <p className="text-sm text-black/55">
                    {isGenerating
                      ? "The next scene is being drafted with continuity checks."
                      : "Autosave keeps the session ready to resume across devices."}
                  </p>
                </div>

                {errorMessage ? (
                  <div className="mt-6 rounded-[1.6rem] border border-[#efc6c0] bg-[#fff3f1] px-5 py-5 shadow-[var(--shadow-soft)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8e2f2f]">
                      Generation issue
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#8e2f2f]/85">{errorMessage}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {lastAction ? (
                        <Button
                          variant="danger"
                          onClick={() => runTurn(lastAction)}
                          disabled={isGenerating}
                        >
                          Retry last action
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={manualSave} disabled={isGenerating}>
                        Save current progress
                      </Button>
                    </div>
                  </div>
                ) : null}

                {!session.currentScene ? (
                  <div className="mt-8">
                    <EmptyState
                      eyebrow="Session Ready"
                      title="This session is set. The story just needs its first spark."
                      description="Starting will generate the opening scene, establish the cast and setting, and offer the first choices."
                      actionLabel={isGenerating ? "Generating..." : "Start session"}
                      onAction={startSession}
                    />
                  </div>
                ) : (
                  <>
                    <article className="grain-overlay relative mt-8 overflow-hidden rounded-[2rem] bg-[#1f1b16] px-6 py-8 text-[#f8eddd] shadow-[0_30px_70px_rgba(23,16,10,0.22)] sm:px-8 md:px-10 md:py-10">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)]" />
                      <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-[#d3a986]">
                        {session.currentScene.title}
                      </p>
                      <div className="relative mt-5 whitespace-pre-wrap text-base leading-8 text-[#f8eddd]/90 sm:text-lg sm:leading-9">
                        {session.currentScene.body}
                      </div>
                    </article>

                    <section className="mt-8">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
                            Choose the next move
                          </p>
                          <p className="mt-2 text-sm leading-6 text-black/60">
                            Every action updates the session state and continuity memory.
                          </p>
                        </div>
                        {isGenerating ? (
                          <p className="animate-fade-up text-sm font-semibold text-black/50">
                            Drafting next scene...
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
                              disabled={isGenerating}
                              onClick={() => submitChoice(choice.id)}
                              className={cn(
                                "group w-full rounded-[1.7rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-5 py-5 text-left shadow-[var(--shadow-soft)] transition duration-200",
                                "hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent-soft)]",
                                "disabled:cursor-not-allowed disabled:opacity-70",
                                isActive && "border-[color:var(--accent)] bg-white",
                              )}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/72 text-sm font-semibold text-black/72">
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-base font-semibold text-black/86">{choice.label}</p>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/42">
                                      {isActive ? "Generating" : "Choice"}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-black/45">
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
                          <p className="text-base font-semibold text-black/86">Try a custom action</p>
                          <p className="mt-1 text-sm leading-6 text-black/58">
                            Use this when the obvious choices miss the move you actually want to make.
                          </p>
                        </div>
                        <Badge>Moderated</Badge>
                      </div>
                      <label className="mt-4 block">
                        <span className="sr-only">Custom action</span>
                        <Textarea
                          className="min-h-32"
                          value={customAction}
                          onChange={(event) => setCustomAction(event.target.value)}
                          placeholder="Negotiate with the captain instead of drawing steel."
                          disabled={isGenerating}
                        />
                      </label>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-6 text-black/55">
                          Unsafe or contradictory requests can be rejected before they become canon.
                        </p>
                        <Button
                          onClick={submitCustomAction}
                          disabled={isGenerating || !customAction.trim()}
                        >
                          {isGenerating && !activeChoiceId ? "Generating..." : "Submit action"}
                        </Button>
                      </div>
                    </Card>
                  </>
                )}
              </Card>
            </div>

            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <Card className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                  Session Overview
                </h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <MetaRow label="Genre" value={session.genre} />
                  <MetaRow label="Tone" value={session.tone} />
                  <MetaRow label="Preset" value={session.enginePreset} />
                  <MetaRow label="Current turn" value={String(session.currentTurn)} />
                </dl>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                    Stats & Inventory
                  </h2>
                  <Badge>{Object.keys(session.canonicalState?.stats ?? {}).length} stats</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {Object.entries(session.canonicalState?.stats ?? {}).length > 0 ? (
                    Object.entries(session.canonicalState?.stats ?? {}).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/68 p-4 shadow-[var(--shadow-soft)]"
                      >
                        <p className="text-[11px] uppercase tracking-[0.2em] text-black/45">{key}</p>
                        <p className="mt-2 text-2xl font-semibold text-black/86">{value}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 rounded-[1.35rem] border border-dashed border-[color:var(--border)] bg-white/42 px-4 py-5 text-sm leading-6 text-black/55">
                      Character stats will appear here once the session starts tracking them.
                    </div>
                  )}
                </div>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                    Inventory
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(session.canonicalState?.inventory.length ?? 0) > 0 ? (
                      session.canonicalState!.inventory.map((item) => (
                        <Badge key={item.id}>
                          {item.label} x{item.quantity}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-black/55">No tracked inventory yet.</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                    Known Characters
                  </h2>
                  <Badge>{session.characters.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {session.characters.length > 0 ? (
                    session.characters.map((character) => (
                      <div
                        key={character.id}
                        className="rounded-[1.35rem] border border-[color:var(--border)] bg-white/68 p-4 shadow-[var(--shadow-soft)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-black/86">{character.name}</p>
                            <p className="text-sm text-black/58">{character.role}</p>
                          </div>
                          <Badge>{character.relationshipBucket}</Badge>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">
                          Relationship score · {character.relationshipScore}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-black/55">
                      Character state will appear here as the session develops.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                  Recap Notes
                </h2>
                <p className="mt-4 text-sm leading-7 text-black/70">
                  {session.canonicalState?.sceneSummary ??
                    session.currentSceneSummary ??
                    "The session recap will appear here after the first turn."}
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <EmptyState
            eyebrow="Missing Session"
            title="Session not found"
            description="The requested story session could not be loaded."
            actionLabel="Back to dashboard"
            onAction={() => router.push("/dashboard")}
          />
        )}

        {historyOpen ? (
          <Panel
            title="Turn History"
            description="Review the sequence of scenes, decisions, and summaries that shaped the current run."
            onClose={() => setHistoryOpen(false)}
          >
            {history.length > 0 ? (
              history.map((turn) => (
                <div
                  key={`${turn.turnNumber}-${turn.sceneTitle}`}
                  className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/74 p-5 shadow-[var(--shadow-soft)]"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent)]">
                    Turn {turn.turnNumber}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-black/86">
                    {turn.sceneTitle ?? "Untitled scene"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-black/70">{turn.sceneSummary}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.22em] text-black/45">
                    Action · {turn.chosenAction}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/44 px-5 py-8 text-sm leading-6 text-black/58">
                No turn history is available yet. Start the session and make a choice to begin recording the trail.
              </div>
            )}
          </Panel>
        ) : null}

        {recapOpen && recap ? (
          <Panel
            title="Session Recap"
            description="A compact continuity-friendly recap of the key beats, unresolved threads, and recent momentum."
            onClose={() => setRecapOpen(false)}
          >
            <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-white/74 p-5 shadow-[var(--shadow-soft)]">
              <p className="text-sm leading-7 text-black/75">{recap.recap}</p>
            </div>
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                Highlights
              </p>
              <div className="mt-3 space-y-3">
                {recap.highlights.length > 0 ? (
                  recap.highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.4rem] border border-[color:var(--border)] bg-white/72 px-4 py-4 text-sm leading-6 shadow-[var(--shadow-soft)]"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-[color:var(--border)] bg-white/44 px-4 py-5 text-sm text-black/58">
                    No recap highlights were generated yet.
                  </div>
                )}
              </div>
            </section>
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                Open Threads
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recap.openThreads.length > 0 ? (
                  recap.openThreads.map((item) => <Badge key={item}>{item}</Badge>)
                ) : (
                  <p className="text-sm text-black/55">No open threads were highlighted.</p>
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
      <dt className="text-black/55">{label}</dt>
      <dd className="font-semibold text-black/82">{value}</dd>
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
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1b140d]/35 backdrop-blur-md">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-white/35 bg-[#f7efe3] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)]">
              Memory View
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-black/88">{title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">{description}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
