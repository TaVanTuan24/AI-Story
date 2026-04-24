"use client";

import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { useI18n } from "@/components/providers/i18n-provider";
import { FantasyGlowCard } from "@/components/theme/fantasy-glow-card";
import { MagicalBackground } from "@/components/theme/magical-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function HomeClient() {
  const { dictionary } = useI18n();
  const copy = dictionary.landing;

  return (
    <SiteShell mode="marketing">
      <MagicalBackground className="rounded-[2.5rem] p-1">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <FantasyGlowCard className="overflow-hidden p-8 md:p-12">
          <div className="flex flex-wrap gap-3">
            {copy.badges.map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl leading-[1.05] font-semibold md:text-7xl">
            {copy.title}
          </h1>
          <p className="text-ui-muted mt-6 max-w-2xl text-lg leading-8">
            {copy.description}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/register">
              <Button>{copy.start}</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">{copy.resume}</Button>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {copy.highlights.map((item) => (
              <div
                key={item}
                className="surface-panel rounded-[1.5rem] p-4 text-sm leading-7 text-[color:var(--text-secondary)]"
              >
                {item}
              </div>
            ))}
          </div>
        </FantasyGlowCard>

        <Card className="themed-prose-panel overflow-hidden p-8">
          <p className="text-xs font-semibold tracking-[0.32em] text-[color:var(--accent-strong)] uppercase">
            {copy.readingExperience}
          </p>
          <h2 className="mt-5 text-3xl font-semibold">{copy.builtForPlay}</h2>
          <div className="mt-7 space-y-4 text-sm leading-7 text-[color:var(--text-muted)]">
            {copy.readerPoints.map((point) => (
              <p key={point}>{point}</p>
            ))}
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-[color:var(--border-strong)] bg-[color:var(--surface-strong)]/30 p-5">
            <p className="text-xs tracking-[0.28em] text-[color:var(--accent-strong)] uppercase">
              {copy.exampleMood}
            </p>
            <p className="mt-4 text-base leading-8 text-[color:var(--text-secondary)]">
              {copy.example}
            </p>
          </div>
        </Card>
      </section>
      </MagicalBackground>
    </SiteShell>
  );
}
