"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { href: "/dashboard", label: "Library" },
  { href: "/story-sessions/new", label: "Create" },
  { href: "/profile", label: "Profile" },
];

export function SiteShell({
  children,
  mode = "app",
}: {
  children: React.ReactNode;
  mode?: "app" | "marketing";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/82 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-[var(--content-width)] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1f1b16] text-sm font-semibold uppercase tracking-[0.28em] text-[#f8eddd] shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:-translate-y-0.5">
              AS
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.28em] uppercase text-[color:var(--accent)]">
                AI Story
              </p>
              <p className="truncate text-sm text-black/60">
                Living interactive fiction
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-white/55 p-1 shadow-[var(--shadow-soft)] lg:flex">
            {mode === "app" && isAuthenticated
              ? navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition duration-200",
                      pathname === item.href
                        ? "bg-[#1f1b16] text-[#f8eddd] shadow-[var(--shadow-soft)]"
                        : "text-black/68 hover:bg-white/80 hover:text-black",
                    )}
                  >
                    {item.label}
                </Link>
                ))
              : null}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden rounded-full border border-[color:var(--border)] bg-white/65 px-4 py-2 text-sm shadow-[var(--shadow-soft)] md:block">
                  <span className="text-black/55">Signed in as </span>
                  <span className="font-semibold text-black/80">{user.displayName}</span>
                </div>
                <Button
                  variant="secondary"
                  className="min-w-[7.25rem]"
                  onClick={() => {
                    signOut();
                    router.replace("/");
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-black/68 transition hover:bg-white/60 hover:text-black"
                >
                  Login
                </Link>
                <Button className="min-w-[8.5rem]" onClick={() => router.push("/register")}>
                  Start Playing
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[var(--content-width)] px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
