import { Suspense } from "react";
import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { AuthForm } from "@/features/auth/auth-form";

export default function RegisterPage() {
  return (
    <SiteShell mode="marketing">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-[2rem] border bg-[#1b1815] p-8 text-[#f8eddd]">
          <p className="text-xs font-semibold tracking-[0.32em] uppercase text-[#d8af8d]">
            New Account
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Build a shelf of living stories instead of one-off prompts.
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#f8eddd]/80">
            Create sessions, return later, and let the narrative engine keep the canon
            coherent while the AI keeps the fiction alive.
          </p>
          <p className="mt-8 text-sm text-[#f8eddd]/70">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white">
              Log in instead
            </Link>
          </p>
        </section>
        <Suspense fallback={<div className="h-[38rem] animate-pulse rounded-[2rem] bg-white/55" />}>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </SiteShell>
  );
}
