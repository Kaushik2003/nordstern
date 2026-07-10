'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 3 — no backend. The platform sends transactional email (application received /
// approved / rejected) but has no notion of an admin alerting rule, a delivery log, or a
// notification channel. There is nothing to read.
export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alerting rules and delivery history for the internal team."
        actions={<StateBadge state="no-backend" />}
      />

      <ScaffoldNotice
        state="no-backend"
        source="nowhere — the mailer sends transactional email to founders, but no rule, channel, or delivery-log table exists"
        needs="a notification_rules and notification_deliveries schema, a channel adapter interface (email, Slack, webhook) with a mock default, and an event bus the rules can subscribe to"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <PlannedPanel
          title="Rules"
          description="What the internal team wants to hear about."
          fields={['New application submitted', 'Provisioning failed', 'Anchor unreachable', 'Reconciliation delta exceeds threshold']}
        />
        <PlannedPanel
          title="Channels"
          description="Where an alert is delivered. Adapter-backed, mock by default."
          fields={['Email', 'Slack', 'Webhook', 'PagerDuty']}
        />
      </div>

      <PlannedTable
        columns={['Rule', 'Trigger', 'Channel', 'Last fired', 'Deliveries', 'Status']}
        note="Nothing to show — notification rules are not modelled anywhere."
      />

      <p className="mt-4 text-xs text-muted-foreground">
        Transactional founder email (application received, approved, rejected) does work today and is sent
        from the platform mailer — it is simply not configurable or logged here.
      </p>
    </>
  );
}
