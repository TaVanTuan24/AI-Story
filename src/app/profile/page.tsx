import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { PreferencesForm } from "@/features/profile/preferences-form";

export default function ProfilePage() {
  return (
    <SiteShell>
      <RequireAuth>
        <PreferencesForm />
      </RequireAuth>
    </SiteShell>
  );
}
