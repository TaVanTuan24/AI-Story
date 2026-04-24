"use client";

import { useState } from "react";

import { useI18n, languageLabels } from "@/components/providers/i18n-provider";
import { supportedLanguages, type LanguageCode } from "@/lib/i18n/types";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { language, setLanguage, t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  async function choose(nextLanguage: LanguageCode) {
    if (nextLanguage === language || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await setLanguage(nextLanguage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-1 shadow-[var(--shadow-soft)]",
        className,
      )}
      aria-label={t("common.language")}
    >
      {supportedLanguages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => choose(item)}
          disabled={isSaving}
          aria-pressed={language === item}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]",
            language === item
              ? "bg-[color:var(--surface-dark)] text-[color:var(--button-primary-text)] shadow-[var(--shadow-soft)]"
              : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-selected)] hover:text-[color:var(--text-primary)]",
          )}
          title={languageLabels[item]}
        >
          {compact ? item.toUpperCase() : languageLabels[item]}
        </button>
      ))}
    </div>
  );
}
