"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { RequireAuth } from "@/components/layout/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { SessionListItem } from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";
import { SessionCard } from "@/features/dashboard/session-card";

export function DashboardClient() {
  const { token, isReady } = useAuth();
  const { push } = useToast();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.listSessions(token)
      .then(setSessions)
      .catch((error) => {
        const message =
          error instanceof ApiClientError ? error.message : "Failed to load your sessions.";
        push({
          title: "Could not load library",
          description: message,
          tone: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [push, token]);

  const filtered = sessions
    .filter((session) =>
      `${session.title} ${session.premise} ${session.genre} ${session.tone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((session) => (genreFilter === "all" ? true : session.genre === genreFilter))
    .sort((left, right) => {
      if (sort === "title") {
        return left.title.localeCompare(right.title);
      }
      return new Date(right.lastPlayedAt).getTime() - new Date(left.lastPlayedAt).getTime();
    });

  const genres = Array.from(new Set(sessions.map((session) => session.genre)));
  const hasActiveFilters = query.trim().length > 0 || genreFilter !== "all" || sort !== "recent";

  return (
    <SiteShell>
      <RequireAuth>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_22rem]">
          <Card className="relative overflow-hidden p-7 sm:p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/70 to-transparent" />
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Personal Library</Badge>
              <Badge>{sessions.length} saved sessions</Badge>
              {filtered.length !== sessions.length ? <Badge>{filtered.length} visible</Badge> : null}
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
              Dashboard
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-balance sm:text-5xl md:text-[3.6rem]">
              Return to the stories that still have something to say.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-black/68 sm:text-lg">
              Browse ongoing sessions, refine the shelf by mood or genre, and jump back in
              without losing the thread.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/story-sessions/new">
                <Button>Create a new session</Button>
              </Link>
              <Link href="/profile">
                <Button variant="secondary">Tune preferences</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                  Filter Library
                </p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Find a session by title, premise, genre, or sort order.
                </p>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[color:var(--accent)] transition hover:text-black"
                  onClick={() => {
                    setQuery("");
                    setGenreFilter("all");
                    setSort("recent");
                  }}
                >
                  Reset
                </button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, premise, genre, or tone"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/48">
                    Genre
                  </span>
                  <select
                    className="w-full rounded-[1.2rem] border border-[color:var(--border)] bg-white/78 px-4 py-3 text-sm shadow-[var(--shadow-soft)] outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                    value={genreFilter}
                    onChange={(event) => setGenreFilter(event.target.value)}
                  >
                    <option value="all">All genres</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/48">
                    Sort
                  </span>
                  <select
                    className="w-full rounded-[1.2rem] border border-[color:var(--border)] bg-white/78 px-4 py-3 text-sm shadow-[var(--shadow-soft)] outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="recent">Last played</option>
                    <option value="title">Title</option>
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
                      <div className="h-7 w-20 animate-shimmer rounded-full bg-white/65" />
                      <div className="h-7 w-16 animate-shimmer rounded-full bg-white/60" />
                    </div>
                    <div className="h-8 w-2/3 animate-shimmer rounded-2xl bg-white/60" />
                    <div className="space-y-2">
                      <div className="h-4 w-full animate-shimmer rounded-full bg-white/55" />
                      <div className="h-4 w-11/12 animate-shimmer rounded-full bg-white/55" />
                      <div className="h-4 w-2/3 animate-shimmer rounded-full bg-white/55" />
                    </div>
                    <div className="h-28 animate-shimmer rounded-[1.5rem] bg-white/60" />
                    <div className="h-12 w-full animate-shimmer rounded-[1.2rem] bg-white/60" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              eyebrow={hasActiveFilters ? "No Matches" : "Your Library"}
              title={hasActiveFilters ? "No sessions match those filters" : "Your library is still waiting for its first story"}
              description={
                hasActiveFilters
                  ? "Try broadening the search or clearing the active filters to bring more sessions back into view."
                  : "Create your first story session to start building a shelf of living, replayable fiction."
              }
              actionLabel="Create a session"
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
      </RequireAuth>
    </SiteShell>
  );
}
