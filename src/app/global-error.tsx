"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLanguageCode, type LanguageCode } from "@/lib/i18n/types";

const STORAGE_KEY = "ai-story.interface-language";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [language] = useState<LanguageCode>(() => getInitialLanguage());

  const dictionary = getDictionary(language);

  return (
    <html lang={language}>
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-6 py-16">
          <p className="eyebrow-label text-xs font-semibold uppercase">
            {dictionary.appError.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            {dictionary.appError.title}
          </h1>
          <p className="text-ui-muted mt-4 text-sm leading-7">
            {dictionary.appError.description}
          </p>
          <div className="mt-8">
            <Button onClick={reset}>{dictionary.appError.retry}</Button>
          </div>
        </div>
      </body>
    </html>
  );
}

function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }

  const documentLanguage = document.documentElement.lang;
  if (isLanguageCode(documentLanguage)) {
    return documentLanguage;
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return isLanguageCode(storedLanguage) ? storedLanguage : "en";
}
