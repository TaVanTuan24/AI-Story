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
        "inline-flex rounded-full border border-[color:var(--border)] bg-white/72 px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-black/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
