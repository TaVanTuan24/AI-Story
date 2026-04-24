"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SessionListItem } from "@/lib/api/client";

export function SessionCard({ session }: { session: SessionListItem }) {
  const { t, language } = useI18n();

  return (
    <Card className="group flex h-full flex-col justify-between overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] sm:p-7">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{session.genre}</Badge>
            <Badge>{session.tone}</Badge>
            <Badge>{session.enginePreset}</Badge>
          </div>
          <div className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)] px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-[color:var(--text-subtle)] uppercase shadow-[var(--shadow-soft)]">
            {t("dashboard.card.turnLabel", "Turn {turn}").replace(
              "{turn}",
              String(session.currentTurn),
            )}
          </div>
        </div>
        <h2 className="mt-5 text-2xl leading-tight font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--text-primary)]">
          {session.title}
        </h2>
        <p className="text-ui-muted mt-3 line-clamp-3 text-sm leading-7">
          {session.currentSceneSummary || session.premise}
        </p>
        <div className="surface-panel mt-5 rounded-[1.35rem] px-4 py-4 shadow-[var(--shadow-soft)]">
          <p className="eyebrow-label text-[11px] font-semibold uppercase">
            {t("dashboard.card.latestBeat", "Latest beat")}
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold text-[color:var(--text-primary)]">
            {session.latestSceneTitle ||
              (session.currentTurn > 0
                ? t("dashboard.card.sceneInProgress", "Scene in progress")
                : t(
                    "dashboard.card.openingPending",
                    "Opening scene not generated yet",
                  ))}
          </p>
          <p className="text-ui-subtle mt-2 text-sm">
            {session.currentTurn > 0
              ? t(
                  "dashboard.card.lastPlayed",
                  "Last played {relative}",
                ).replace(
                  "{relative}",
                  formatRelative(session.lastPlayedAt, language),
                )
              : t(
                  "dashboard.card.fresh",
                  "Freshly created and waiting for its first scene.",
                )}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-ui-faint flex items-center justify-between text-xs tracking-[0.24em] uppercase">
          <span>{session.status}</span>
          <span>
            {session.currentTurn > 0
              ? t("dashboard.card.inProgress", "In progress")
              : t("dashboard.card.readyToBegin", "Ready to begin")}
          </span>
        </div>
        <div className="mt-5 flex gap-3">
          <Link href={`/story-sessions/${session.id}`} className="flex-1">
            <Button className="w-full">
              {session.currentTurn > 0
                ? t("dashboard.card.continueStory", "Continue story")
                : t("dashboard.card.openSession", "Open session")}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatRelative(value: string, language: string) {
  const date = new Date(value);
  const diffHours = Math.round(
    (Date.now() - date.getTime()) / (1000 * 60 * 60),
  );
  if (diffHours < 1) {
    return language === "vi"
      ? "chưa đến một giờ trước"
      : "less than an hour ago";
  }
  if (diffHours < 24) {
    return language === "vi" ? `${diffHours} giờ trước` : `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return language === "vi" ? `${diffDays} ngày trước` : `${diffDays}d ago`;
}
