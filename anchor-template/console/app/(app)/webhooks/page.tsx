'use client';

import { ComingSoon } from '@/components/coming-soon';

// Outbound webhook delivery tracking + endpoint management aren't wired on the backend yet.
// Rather than a table that's always empty, show an honest Coming-soon state.
export default function WebhooksPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Webhooks</h1>
        <p className="text-sm text-subtle">Outbound event notifications for your integrations.</p>
      </div>
      <ComingSoon
        title="Webhooks are coming soon"
        description="Register endpoints and track delivery history for anchor events. This surface isn’t wired to the backend yet — no placeholder data is shown."
      />
    </div>
  );
}
