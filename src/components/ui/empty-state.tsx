import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  eyebrow = "Nothing Here Yet",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  eyebrow?: string;
}) {
  return (
    <Card className="grain-overlay border-dashed border-[color:var(--border-strong)] p-8 text-center shadow-[var(--shadow-soft)] sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[color:var(--border)] bg-white/70 text-sm font-semibold tracking-[0.22em] uppercase text-[color:var(--accent)]">
        AS
      </div>
      <p className="mt-5 text-[11px] font-semibold tracking-[0.38em] uppercase text-[color:var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="text-balance mt-4 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--muted)] sm:text-[15px]">
        {description}
      </p>
      {actionLabel && onAction ? (
        <div className="mt-7">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </Card>
  );
}
