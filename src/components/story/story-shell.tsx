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
        <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[color:var(--accent)]">
          {genre}
        </p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-black/80">{currentScene}</p>
      </article>

      <aside className="space-y-6">
        <section className="rounded-[2rem] border bg-[color:var(--surface-strong)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-black/65">
            Story Summary
          </h2>
          <p className="mt-4 text-sm leading-7 text-black/75">{summary}</p>
        </section>

        <section className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-black/65">
            Next Actions
          </h2>
          <div className="mt-4 space-y-3">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="w-full rounded-full border bg-white/70 px-4 py-3 text-left text-sm transition hover:border-[color:var(--accent)] hover:bg-white"
              >
                {choice.label}
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm text-black/70">
            Custom action
            <textarea
              className="mt-2 min-h-28 w-full rounded-3xl border bg-white/80 px-4 py-3 outline-none"
              placeholder="Type a custom action for the protagonist..."
              disabled
            />
          </label>
        </section>
      </aside>
    </section>
  );
}
