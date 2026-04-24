import { cn } from "@/lib/utils/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "surface-glow rounded-[var(--radius-card)] border bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-[var(--shadow-card)] backdrop-blur-xl transition-shadow duration-300",
        className,
      )}
    >
      {children}
    </section>
  );
}
