import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { CreateSessionForm } from "@/features/story/create-session-form";

export default function NewStorySessionPage() {
  return (
    <SiteShell>
      <RequireAuth>
        <CreateSessionForm />
      </RequireAuth>
    </SiteShell>
  );
}
