import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { AISettingsForm } from "@/features/profile/ai-settings-form";
import { PreferencesForm } from "@/features/profile/preferences-form";

export default function ProfilePage() {
  return (
    <SiteShell>
      <RequireAuth>
        <div className="space-y-6">
          <PreferencesForm />
          <AISettingsForm />
        </div>
      </RequireAuth>
    </SiteShell>
  );
}
