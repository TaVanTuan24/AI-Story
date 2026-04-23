"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center px-6 py-16">
      <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[color:var(--accent)]">
        Application Error
      </p>
      <h1 className="mt-4 text-4xl font-semibold">Something went wrong while loading this page.</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-black/70">
        The request failed or the page crashed during rendering. You can retry this view safely.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
