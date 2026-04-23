import { RequireAuth } from "@/components/layout/require-auth";
import { SiteShell } from "@/components/layout/site-shell";
import { AdminAnalyticsClient } from "@/features/admin/admin-analytics-client";

export default function AdminAnalyticsPage() {
  return (
    <SiteShell>
      <RequireAuth>
        <AdminAnalyticsClient />
      </RequireAuth>
    </SiteShell>
  );
}
