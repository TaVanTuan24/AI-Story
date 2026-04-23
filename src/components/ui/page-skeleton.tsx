import { cn } from "@/lib/utils/cn";

export function PageSkeleton({
  variant = "page",
}: {
  variant?: "page" | "story";
}) {
  return (
    <div className="mx-auto flex w-full max-w-[var(--content-width)] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="animate-fade-up">
        <div className="animate-shimmer h-4 w-28 rounded-full bg-linear-to-r from-white/55 via-white/90 to-white/55" />
        <div className="animate-shimmer mt-4 h-14 w-full max-w-2xl rounded-[1.75rem] bg-linear-to-r from-white/45 via-white/85 to-white/45 sm:h-16" />
        <div className="animate-shimmer mt-4 h-5 w-full max-w-3xl rounded-full bg-linear-to-r from-white/35 via-white/70 to-white/35" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <div className="animate-shimmer rounded-[2rem] border border-white/40 bg-linear-to-r from-white/40 via-white/80 to-white/40 p-8">
            <div className="h-4 w-32 rounded-full bg-black/5" />
            <div className="mt-6 h-8 w-3/4 rounded-full bg-black/5" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: variant === "story" ? 7 : 4 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-4 rounded-full bg-black/5",
                    index === 0 && "w-full",
                    index === 1 && "w-[94%]",
                    index === 2 && "w-[91%]",
                    index === 3 && "w-[88%]",
                    index === 4 && "w-[84%]",
                    index >= 5 && "w-[76%]",
                  )}
                />
              ))}
            </div>
          </div>
          {variant === "story" ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-shimmer h-24 rounded-[1.5rem] border border-white/40 bg-linear-to-r from-white/40 via-white/80 to-white/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-shimmer h-72 rounded-[2rem] border border-white/40 bg-linear-to-r from-white/40 via-white/80 to-white/40"
                />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-shimmer h-48 rounded-[2rem] border border-white/40 bg-linear-to-r from-white/40 via-white/80 to-white/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
