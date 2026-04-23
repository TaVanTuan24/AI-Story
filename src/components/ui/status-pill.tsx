import { cn } from "@/lib/utils/cn";

export function StatusPill({
  tone,
  label,
}: {
  tone: "saving" | "saved" | "loading" | "error";
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        tone === "saving" && "border-[#f0d7a0] bg-[#fff5df] text-[color:var(--warning)]",
        tone === "saved" && "border-[#c6ead5] bg-[#eff9f2] text-[color:var(--success)]",
        tone === "loading" && "border-[#ced7f7] bg-[#eceffb] text-[color:var(--info)]",
        tone === "error" && "border-[#f4c6c1] bg-[#fff1ef] text-[color:var(--danger)]",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full bg-current",
          tone === "loading" && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
