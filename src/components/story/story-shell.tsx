type StoryShellProps = {
  title: string;
  genre: string;
  summary: string;
  currentScene: string;
  choices: Array<{
    id: string;
    label: string;
  }>;
};

export function StoryShell({
  title,
  genre,
  summary,
  currentScene,
  choices,
}: StoryShellProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.7fr_0.95fr]">
      <article className="rounded-[2rem] border bg-[color:var(--surface)] p-8 shadow-sm">
        <p className="eyebrow-label text-xs font-semibold uppercase">{genre}</p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold">{title}</h1>
        <p className="text-ui-secondary mt-6 text-lg leading-8">
          {currentScene}
        </p>
      </article>

      <aside className="space-y-6">
        <section className="rounded-[2rem] border bg-[color:var(--surface-strong)] p-6 shadow-sm">
          <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.2em] uppercase">
            Story Summary
          </h2>
          <p className="text-ui-secondary mt-4 text-sm leading-7">{summary}</p>
        </section>

        <section className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-sm">
          <h2 className="text-ui-subtle text-sm font-semibold tracking-[0.2em] uppercase">
            Next Actions
          </h2>
          <div className="mt-4 space-y-3">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-left text-sm text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent)] hover:bg-[color:var(--surface-selected)] focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]"
              >
                {choice.label}
              </button>
            ))}
          </div>
          <label className="text-ui-secondary mt-5 block text-sm">
            Custom action
            <textarea
              className="mt-2 min-h-28 w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-[color:var(--text-secondary)] outline-none"
              placeholder="Type a custom action for the protagonist..."
              disabled
            />
          </label>
        </section>
      </aside>
    </section>
  );
}
