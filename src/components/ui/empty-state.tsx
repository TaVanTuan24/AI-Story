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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-sm font-semibold tracking-[0.22em] text-[color:var(--accent)] uppercase">
        AS
      </div>
      <p className="eyebrow-label mt-5 text-[11px] font-semibold tracking-[0.38em] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-2xl font-semibold text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="text-ui-muted mx-auto mt-3 max-w-xl text-sm leading-7 sm:text-[15px]">
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
