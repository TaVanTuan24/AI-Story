import { Suspense } from "react";
import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <SiteShell mode="marketing">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-[2rem] border bg-[#1b1815] p-8 text-[#f8eddd]">
          <p className="text-xs font-semibold tracking-[0.32em] uppercase text-[#d8af8d]">
            Library Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Return to the story exactly where you left it.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#f8eddd]/80">
            Your sessions, recaps, history, and preference tuning all live behind one
            login.
          </p>
          <p className="mt-8 text-sm text-[#f8eddd]/70">
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-white">
              Create one here
            </Link>
          </p>
        </section>
        <Suspense fallback={<div className="h-[38rem] animate-pulse rounded-[2rem] bg-white/55" />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </SiteShell>
  );
}
