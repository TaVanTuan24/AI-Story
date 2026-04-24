import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function FantasyGlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "fantasy-glow-card overflow-hidden",
        className,
      )}
    >
      {children}
    </Card>
  );
}
