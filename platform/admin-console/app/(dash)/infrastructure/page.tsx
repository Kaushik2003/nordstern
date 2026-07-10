'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 3 — no backend. Nothing stores a time series. The control-plane records the CURRENT
// stack status; nobody writes history, and no metrics collector runs against the per-anchor
// containers. Uptime charts and SLA numbers cannot be "connected" — the data was never kept.
export default function InfrastructurePage() {
  return (
    <>
      <PageHeader
        title="Infrastructure"
        description="Resource usage and availability history for the anchor fleet."
        actions={<StateBadge state="no-backend" />}
      />

      <ScaffoldNotice
        state="no-backend"
        source="nowhere — the control-plane keeps only the current stack status; no service writes a time series, and no metrics collector runs"
        needs="a metrics pipeline (Prometheus or the Docker stats API) writing to a time-series store, plus a health-history table before any uptime or SLA figure can be computed"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <PlannedPanel
          title="Availability"
          description="Requires health history that nothing records today."
          fields={['Fleet uptime (30d)', 'Incidents', 'Mean time to recovery', 'SLA breaches']}
        />
        <PlannedPanel
          title="Container resources"
          description="Per anchor: Anchor Platform, business server, console, client."
          fields={['CPU', 'Memory', 'Disk', 'Restarts']}
        />
        <PlannedPanel
          title="Shared services"
          description="The platform's own dependencies."
          fields={['Postgres connections', 'Traefik routes', 'Secret store reachability', 'Horizon latency']}
        />
      </div>

      <PlannedTable
        columns={['Container', 'Anchor', 'CPU', 'Memory', 'Restarts', 'Uptime']}
        note="Nothing to show — no metrics are collected or persisted for any container."
      />

      <p className="mt-4 text-xs text-muted-foreground">
        Production infrastructure hardening is deliberately out of scope for the MVP; Docker Compose is the
        chosen local-dev path. See the decision log, DL-002.
      </p>
    </>
  );
}
