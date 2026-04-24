import { Suspense } from "react";
import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { MagicalBackground } from "@/components/theme/magical-background";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <SiteShell mode="marketing">
      <MagicalBackground intensity="soft" className="rounded-[2.5rem] p-1">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="themed-prose-panel rounded-[2rem] border p-8">
          <p className="text-xs font-semibold tracking-[0.32em] text-[color:var(--accent-strong)] uppercase">
            Library Access
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold">
            Return to the story exactly where you left it.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[color:var(--text-muted)]">
            Your sessions, recaps, history, and preference tuning all live
            behind one login.
          </p>
          <p className="mt-8 text-sm text-[color:var(--text-subtle)]">
            Need an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[color:var(--text-primary)] underline-offset-4 hover:underline"
            >
              Create one here
            </Link>
          </p>
        </section>
        <Suspense
          fallback={
            <div className="h-[38rem] animate-pulse rounded-[2rem] bg-[color:var(--surface-strong)]" />
          }
        >
          <AuthForm mode="login" />
        </Suspense>
      </div>
      </MagicalBackground>
    </SiteShell>
  );
}
