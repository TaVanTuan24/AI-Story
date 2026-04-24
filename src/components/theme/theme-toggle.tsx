"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const { t } = useI18n();

  if (compact) {
    const nextPreference =
      resolvedTheme === "dark" ? ("light" as const) : ("dark" as const);

    return (
      <Button
        type="button"
        variant="secondary"
        className={cn("min-w-[7rem]", className)}
        aria-label={t("settings.appearance")}
        onClick={() => void setThemePreference(nextPreference)}
      >
        {resolvedTheme === "dark"
          ? t("settings.appearanceOptions.light")
          : t("settings.appearanceOptions.dark")}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-1 shadow-[var(--shadow-soft)]",
        className,
      )}
      role="group"
      aria-label={t("settings.appearance")}
    >
      {(["light", "dark", "system"] as const).map((option) => {
        const selected = themePreference === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => void setThemePreference(option)}
            className={cn(
              "rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]",
              selected
                ? "bg-[color:var(--button-primary-bg)] text-[color:var(--button-primary-text)] shadow-[var(--shadow-card)]"
                : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-selected)] hover:text-[color:var(--text-primary)]",
            )}
            aria-pressed={selected}
          >
            {option === "light"
              ? t("settings.appearanceOptions.light")
              : option === "dark"
                ? t("settings.appearanceOptions.dark")
                : t("settings.appearanceOptions.system")}
          </button>
        );
      })}
    </div>
  );
}
