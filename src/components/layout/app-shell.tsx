import Link from "next/link";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-[0.14em] uppercase"
          >
            AI Story
          </Link>
          <nav className="text-ui-muted flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-[color:var(--text-primary)]">
              Overview
            </Link>
            <Link
              href="/stories/demo"
              className="hover:text-[color:var(--text-primary)]"
            >
              Reader Shell
            </Link>
            <a
              href="/api/health"
              className="hover:text-[color:var(--text-primary)]"
            >
              API Health
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
