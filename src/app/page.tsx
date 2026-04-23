import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const highlights = [
  "Infinite, session-based interactive fiction",
  "Narrative engine controls canonical state",
  "Long-term save, recap, resume, and replay flow",
];

export default function HomePage() {
  return (
    <SiteShell mode="marketing">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden p-8 md:p-12">
          <div className="flex flex-wrap gap-3">
            <Badge>AI-generated fiction</Badge>
            <Badge>Structured canon</Badge>
            <Badge>Long-session ready</Badge>
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl leading-[1.05] font-semibold md:text-7xl">
            Interactive fiction that keeps going, remembers everything, and still
            feels authored in the moment.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/72">
            Build a session, step into the scene, pick a choice or type your own
            action, and let the engine carry continuity across mystery, romance,
            survival, noir, sci-fi, politics, and more.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/register">
              <Button>Start your first session</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Resume existing sessions</Button>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-[1.5rem] border bg-white/55 p-4 text-sm leading-7">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden bg-[#1b1815] p-8 text-[#f8eddd]">
          <p className="text-xs font-semibold tracking-[0.32em] uppercase text-[#d8af8d]">
            Reading Experience
          </p>
          <h2 className="mt-5 text-3xl font-semibold">Built for long-form play</h2>
          <div className="mt-7 space-y-4 text-sm leading-7 text-[#f8eddd]/82">
            <p>Premium reading layout with large choices and live side-panel state.</p>
            <p>Resume-friendly dashboard with search, filters, and last-played context.</p>
            <p>Recap and history tools so a session still feels coherent days later.</p>
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
            <p className="text-xs tracking-[0.28em] uppercase text-[#d8af8d]">Example mood</p>
            <p className="mt-4 text-base leading-8 text-[#f8eddd]/92">
              Rain silvered the tram rails when the message arrived: your brother&apos;s
              handwriting, tomorrow&apos;s victim, and an address you had already burned.
            </p>
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
