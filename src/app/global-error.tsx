"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-6 py-16">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[color:var(--accent)]">
            Critical Error
          </p>
          <h1 className="mt-4 text-4xl font-semibold">The application hit an unrecoverable error.</h1>
          <p className="mt-4 text-sm leading-7 text-black/70">
            Refresh the page or try again shortly. If the problem persists, check the server logs with the request ID from the failed API call.
          </p>
          <div className="mt-8">
            <Button onClick={reset}>Reload app shell</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
