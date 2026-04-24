import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-[color:var(--border-strong)] bg-[color:var(--badge-bg)] px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-[color:var(--badge-text)] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
