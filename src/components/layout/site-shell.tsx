"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { href: "/dashboard", labelKey: "nav.library" },
  { href: "/story-sessions/new", labelKey: "nav.create" },
  { href: "/profile", labelKey: "nav.profile" },
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
  const { t } = useI18n();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/82 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-[var(--content-width)] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="themed-brand-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold tracking-[0.28em] uppercase shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:-translate-y-0.5">
              AS
            </span>
            <div className="min-w-0">
              <p className="eyebrow-label text-xs font-semibold uppercase">
                {t("common.appName")}
              </p>
              <p className="text-ui-muted truncate text-sm">
                {t("common.appTagline")}
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-1 shadow-[var(--shadow-soft)] lg:flex">
            {mode === "app" && isAuthenticated
              ? navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]",
                      pathname === item.href
                        ? "bg-[color:var(--surface-dark)] text-[color:var(--button-primary-text)] shadow-[var(--shadow-soft)]"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-selected)] hover:text-[color:var(--text-primary)]",
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))
              : null}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle compact className="hidden sm:inline-flex" />
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
            {isAuthenticated && user ? (
              <>
                <div className="hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm shadow-[var(--shadow-soft)] md:block">
                  <span className="text-[color:var(--text-subtle)]">
                    {t("common.signedInAs")}{" "}
                  </span>
                  <span className="font-semibold text-[color:var(--text-primary)]">
                    {user.displayName}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="min-w-[7.25rem]"
                  onClick={() => {
                    signOut();
                    router.replace("/");
                  }}
                >
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--text-primary)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]"
                >
                  {t("common.login")}
                </Link>
                <Button
                  className="min-w-[8.5rem]"
                  onClick={() => router.push("/register")}
                >
                  {t("nav.startPlaying")}
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
