"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RequireAuth } from "@/components/layout/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MagicalBackground } from "@/components/theme/magical-background";
import type { SessionListItem } from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";
import { SessionCard } from "@/features/dashboard/session-card";

export function DashboardClient() {
  const { token, isReady } = useAuth();
  const { push } = useToast();
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .listSessions(token)
      .then(setSessions)
      .catch((error) => {
        const message =
          error instanceof ApiClientError
            ? error.message
            : t("dashboard.failedLoad");
        push({
          title: t("dashboard.couldNotLoad"),
          description: message,
          tone: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [push, t, token]);

  const filtered = sessions
    .filter((session) =>
      `${session.title} ${session.premise} ${session.genre} ${session.tone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((session) =>
      genreFilter === "all" ? true : session.genre === genreFilter,
    )
    .sort((left, right) => {
      if (sort === "title") {
        return left.title.localeCompare(right.title);
      }
      return (
        new Date(right.lastPlayedAt).getTime() -
        new Date(left.lastPlayedAt).getTime()
      );
    });

  const genres = Array.from(new Set(sessions.map((session) => session.genre)));
  const hasActiveFilters =
    query.trim().length > 0 || genreFilter !== "all" || sort !== "recent";

  return (
    <SiteShell>
      <RequireAuth>
        <MagicalBackground intensity="soft" className="rounded-[2.5rem] p-1">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_22rem]">
          <Card className="relative overflow-hidden p-7 sm:p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/70 to-transparent" />
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{t("dashboard.personalLibrary")}</Badge>
              <Badge>
                {sessions.length} {t("dashboard.savedSessions")}
              </Badge>
              {filtered.length !== sessions.length ? (
                <Badge>
                  {filtered.length} {t("dashboard.visible")}
                </Badge>
              ) : null}
            </div>
            <p className="eyebrow-label mt-6 text-xs font-semibold uppercase">
              {t("dashboard.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold text-balance sm:text-5xl md:text-[3.6rem]">
              {t("dashboard.title")}
            </h1>
            <p className="text-ui-muted mt-5 max-w-2xl text-base leading-8 sm:text-lg">
              {t("dashboard.description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/story-sessions/new">
                <Button>{t("dashboard.createSession")}</Button>
              </Link>
              <Link href="/profile">
                <Button variant="secondary">
                  {t("dashboard.tunePreferences")}
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-ui-subtle text-sm font-semibold tracking-[0.22em] uppercase">
                  {t("dashboard.filterLibrary")}
                </p>
                <p className="text-ui-muted mt-2 text-sm leading-6">
                  {t("dashboard.filterDescription")}
                </p>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[color:var(--accent)] transition hover:text-[color:var(--text-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]"
                  onClick={() => {
                    setQuery("");
                    setGenreFilter("all");
                    setSort("recent");
                  }}
                >
                  {t("common.reset")}
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("dashboard.searchPlaceholder")}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="space-y-2">
                  <span className="text-ui-faint text-[11px] font-semibold tracking-[0.24em] uppercase">
                    {t("dashboard.genre")}
                  </span>
                  <select
                    className="control-select"
                    value={genreFilter}
                    onChange={(event) => setGenreFilter(event.target.value)}
                  >
                    <option value="all">{t("dashboard.allGenres")}</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-ui-faint text-[11px] font-semibold tracking-[0.24em] uppercase">
                    {t("dashboard.sort")}
                  </span>
                  <select
                    className="control-select"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="recent">{t("dashboard.lastPlayed")}</option>
                    <option value="title">{t("dashboard.titleSort")}</option>
                  </select>
                </label>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-8 sm:mt-10">
          {isLoading && isReady ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="overflow-hidden p-6 sm:p-7">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="animate-shimmer h-7 w-20 rounded-full bg-white/65" />
                      <div className="animate-shimmer h-7 w-16 rounded-full bg-white/60" />
                    </div>
                    <div className="animate-shimmer h-8 w-2/3 rounded-2xl bg-white/60" />
                    <div className="space-y-2">
                      <div className="animate-shimmer h-4 w-full rounded-full bg-white/55" />
                      <div className="animate-shimmer h-4 w-11/12 rounded-full bg-white/55" />
                      <div className="animate-shimmer h-4 w-2/3 rounded-full bg-white/55" />
                    </div>
                    <div className="animate-shimmer h-28 rounded-[1.5rem] bg-white/60" />
                    <div className="animate-shimmer h-12 w-full rounded-[1.2rem] bg-white/60" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              eyebrow={
                hasActiveFilters
                  ? t("dashboard.noMatchesEyebrow", "No Matches")
                  : t("dashboard.personalLibrary")
              }
              title={
                hasActiveFilters
                  ? t("dashboard.noMatches")
                  : t("dashboard.emptyTitle")
              }
              description={
                hasActiveFilters
                  ? t("dashboard.emptyFiltered")
                  : t("dashboard.emptyDescription")
              }
              actionLabel={t("dashboard.createSession")}
              onAction={() => {
                window.location.href = "/story-sessions/new";
              }}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
        </MagicalBackground>
      </RequireAuth>
    </SiteShell>
  );
}
