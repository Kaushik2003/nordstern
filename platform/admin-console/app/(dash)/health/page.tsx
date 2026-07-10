'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 2 — the data exists, this console cannot reach it.
//
// Real container health lives in the control-plane `tenants` table and the aggregator's
// health checks. Both are separate services behind a service-token; platform-api would need
// a proxy (the pattern already exists in provisioner.service.ts). Until that proxy is built
// this page shows the intended SHAPE and nothing else — no invented uptime, no fake pings.
export default function HealthPage() {
  return (
    <>
      <PageHeader
        title="Anchor health"
        description="Live container and endpoint health for every anchor in the fleet."
        actions={<StateBadge state="unwired" />}
      />

      <ScaffoldNotice
        state="unwired"
        source="control-plane `tenants` (:3002) for stack status and container IDs; the aggregator (:3005) for endpoint health checks"
        needs="a read proxy on platform-api — `GET /admin/fleet/health` — authenticating to the control-plane with the service operator token, then fanning out to the aggregator"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <PlannedPanel
          title="Fleet summary"
          description="Rolled up across every provisioned anchor."
          fields={['Anchors reporting healthy', 'Degraded', 'Unreachable', 'Containers running']}
        />
        <PlannedPanel
          title="Per-anchor stack"
          description="From the control-plane's own record of what it launched."
          fields={['stack_status', 'status_detail', 'ap_container_id', 'biz_container_id']}
        />
        <PlannedPanel
          title="Endpoint checks"
          description="What the aggregator already probes for routing decisions."
          fields={['SEP-1 stellar.toml', 'SEP-10 auth', 'SEP-24 interactive', 'Business server /health']}
        />
      </div>

      <PlannedTable
        columns={['Anchor', 'Stack status', 'Detail', 'Anchor Platform', 'Business server', 'Last check']}
        note="No health data — this console has no route to the control-plane or aggregator yet."
      />

      <p className="mt-4 text-xs text-muted-foreground">
        The anchors list shows the platform&apos;s coarse lifecycle status today. That value can lag the real
        container state, which is exactly why it is not labelled health.
      </p>
    </>
  );
}
