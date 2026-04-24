import { cn } from "@/lib/utils/cn";

export function MagicalBackground({
  children,
  className,
  intensity = "medium",
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: "soft" | "medium";
}) {
  return (
    <div
      className={cn(
        "magical-stage relative isolate overflow-hidden",
        intensity === "soft" && "magical-stage-soft",
        className,
      )}
    >
      <div className="magical-stage__mist" aria-hidden="true" />
      <div className="magical-stage__stars" aria-hidden="true" />
      <div className="magical-stage__runes" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
