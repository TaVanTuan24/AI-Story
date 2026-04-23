"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsOverview } from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";

export function AdminAnalyticsClient() {
  const { token } = useAuth();
  const { push } = useToast();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .getAnalyticsOverview(token)
      .then(setOverview)
      .catch((requestError) => {
        const message =
          requestError instanceof ApiClientError
            ? requestError.message
            : "Analytics could not be loaded.";
        setError(message);
        push({
          title: "Analytics unavailable",
          description: message,
          tone: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [push, token]);

  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="h-40 animate-shimmer">
            <div />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <EmptyState
        eyebrow="Admin Analytics"
        title="Analytics could not be loaded"
        description={error ?? "Only configured admin accounts can access this page."}
      />
    );
  }

  const eventMap = Object.fromEntries(
    overview.eventCounts.map((entry) => [entry.eventType, entry.count]),
  );
  const totalTokens = overview.aiUsage.reduce((sum, row) => sum + row.totalTokens, 0);
  const totalFailures =
    Number(eventMap.completion_failed ?? 0) +
    overview.aiUsage.reduce((sum, row) => sum + row.failures, 0);

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden p-7 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[color:var(--accent)] via-white/80 to-transparent" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Internal</Badge>
          <Badge>{overview.windowDays} day window</Badge>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent)]">
          Product Analytics
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-balance sm:text-5xl">
          Story engagement, generation health, and provider usage.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-black/62 sm:text-base">
          This internal view uses aggregate operational metrics only. It avoids raw prompts,
          custom action text, email addresses, and scene content.
        </p>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sessions Created" value={eventMap.session_created ?? 0} />
        <MetricCard label="Sessions Resumed" value={eventMap.session_resumed ?? 0} />
        <MetricCard label="Turns Played" value={eventMap.turn_played ?? 0} />
        <MetricCard label="Completion Failures" value={totalFailures} tone="danger" />
        <MetricCard
          label="Avg Session Length"
          value={`${overview.sessions.averageSessionLengthTurns} turns`}
        />
        <MetricCard
          label="Custom Action Share"
          value={`${overview.actionMix.customActionPercent}%`}
        />
        <MetricCard
          label="Avg Turn Latency"
          value={`${overview.generationLatency.averageMs}ms`}
        />
        <MetricCard label="Total Tokens" value={formatNumber(totalTokens)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <SectionTitle title="Action Mix" description="Button choices vs custom actions." />
          <div className="mt-5 space-y-4">
            <BarRow
              label="Button choices"
              value={overview.actionMix.choiceCount}
              percent={overview.actionMix.choicePercent}
            />
            <BarRow
              label="Custom actions"
              value={overview.actionMix.customActionCount}
              percent={overview.actionMix.customActionPercent}
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Abandon Buckets" description="Where sessions currently stop." />
          <div className="mt-5 space-y-3">
            {overview.abandonBuckets.map((bucket) => (
              <BarRow
                key={bucket.bucket}
                label={bucket.bucket}
                value={bucket.count}
                percent={percentOf(bucket.count, overview.sessions.totalSessions)}
              />
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <SectionTitle title="Top Genres" description="Most selected session genres." />
          <RankedList rows={overview.topGenres} />
        </Card>

        <Card className="p-6">
          <SectionTitle title="Top Tones" description="Most selected tone phrases." />
          <RankedList rows={overview.topTones} />
        </Card>
      </section>

      <Card className="p-6">
        <SectionTitle title="AI Provider Usage" description="Requests, latency, failures, and token volume." />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.22em] text-black/45">
              <tr>
                <th className="py-3">Provider</th>
                <th className="py-3">Model</th>
                <th className="py-3">Requests</th>
                <th className="py-3">Failures</th>
                <th className="py-3">Avg Latency</th>
                <th className="py-3">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {overview.aiUsage.length > 0 ? (
                overview.aiUsage.map((row) => (
                  <tr key={`${row.provider}-${row.model}`}>
                    <td className="py-4 font-semibold">{row.provider}</td>
                    <td className="py-4 text-black/62">{row.model}</td>
                    <td className="py-4">{formatNumber(row.requests)}</td>
                    <td className="py-4">{formatNumber(row.failures)}</td>
                    <td className="py-4">{row.averageLatencyMs}ms</td>
                    <td className="py-4">{formatNumber(row.totalTokens)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-5 text-black/55" colSpan={6}>
                    No AI provider usage has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">
        {label}
      </p>
      <p className={tone === "danger" ? "mt-4 text-3xl font-semibold text-[#8e2f2f]" : "mt-4 text-3xl font-semibold text-black/88"}>
        {value}
      </p>
    </Card>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-black/88">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-black/58">{description}</p>
    </div>
  );
}

function BarRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-black/78">{label}</span>
        <span className="text-black/52">
          {formatNumber(value)} · {percent}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full bg-[color:var(--accent)]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function RankedList({ rows }: { rows: Array<{ label: string; count: number }> }) {
  if (rows.length === 0) {
    return <p className="mt-5 text-sm text-black/55">No data recorded yet.</p>;
  }

  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="mt-5 space-y-3">
      {rows.map((row) => (
        <BarRow
          key={row.label}
          label={row.label}
          value={row.count}
          percent={Math.round((row.count / max) * 100)}
        />
      ))}
    </div>
  );
}

function percentOf(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
