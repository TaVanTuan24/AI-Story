"use client";

import { useEffect } from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center px-6 py-16">
      <p className="eyebrow-label text-xs font-semibold uppercase">
        {t("appError.eyebrow", "Application Error")}
      </p>
      <h1 className="mt-4 text-4xl font-semibold">
        {t("appError.title", "Something went wrong while loading this page.")}
      </h1>
      <p className="text-ui-muted mt-4 max-w-xl text-sm leading-7">
        {t(
          "appError.description",
          "The request failed or the page crashed during rendering. You can retry this view safely.",
        )}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>{t("appError.retry", "Try again")}</Button>
      </div>
    </div>
  );
}
