"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SessionListItem } from "@/lib/api/client";

export function SessionCard({ session }: { session: SessionListItem }) {
  return (
    <Card className="group flex h-full flex-col justify-between overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] sm:p-7">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{session.genre}</Badge>
            <Badge>{session.tone}</Badge>
            <Badge>{session.enginePreset}</Badge>
          </div>
          <div className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-black/52 shadow-[var(--shadow-soft)]">
            Turn {session.currentTurn}
          </div>
        </div>
        <h2 className="mt-5 text-2xl font-semibold leading-tight text-black/90 transition group-hover:text-black">
          {session.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-black/68">
          {session.currentSceneSummary || session.premise}
        </p>
        <div className="mt-5 rounded-[1.35rem] border border-[color:var(--border)] bg-white/62 px-4 py-4 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Latest beat
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold text-black/82">
            {session.latestSceneTitle || (session.currentTurn > 0 ? "Scene in progress" : "Opening scene not generated yet")}
          </p>
          <p className="mt-2 text-sm text-black/56">
            {session.currentTurn > 0
              ? `Last played ${formatRelative(session.lastPlayedAt)}`
              : "Freshly created and waiting for its first scene."}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-black/48">
          <span>{session.status}</span>
          <span>{session.currentTurn > 0 ? "In progress" : "Ready to begin"}</span>
        </div>
        <div className="mt-5 flex gap-3">
          <Link href={`/story-sessions/${session.id}`} className="flex-1">
            <Button className="w-full">
              {session.currentTurn > 0 ? "Continue story" : "Open session"}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffHours = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) {
    return "less than an hour ago";
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
