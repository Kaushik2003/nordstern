'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 2 — reachable data, no proxy.
//
// Two caveats that must stay visible on this page: the alerts table is populated by a demo
// injection endpoint rather than a real reconciler, and the fiat side of the ledger is still
// simulated for some flows. Do not present a delta here as a settled financial discrepancy.
export default function AlertsPage() {
  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Fiat balance versus on-chain balance, per anchor."
        actions={<StateBadge state="unwired" />}
      />

      <ScaffoldNotice
        state="unwired"
        source="control-plane `reconciliation_alerts` and `tenant_config` (:3002)"
        needs="a read proxy on platform-api — `GET /admin/fleet/alerts` — plus a resolve action mapping to the control-plane's existing `POST /config/:anchorId/alerts/:alertId/resolve`"
      />

      <div className="mb-6 rounded-xl border border-warn/30 bg-warn-50 p-4 text-sm">
        <div className="font-medium">Two things to know before trusting this screen</div>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          <li>
            Alerts are currently created by a demo injection endpoint, not by a reconciler observing
            real balances. A row here would not mean money is missing.
          </li>
          <li>
            Fiat payout and some deposit flows are simulated on testnet, so the &ldquo;fiat balance&rdquo;
            side of any delta is not authoritative.
          </li>
        </ul>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <PlannedPanel
          title="Open alerts"
          description="Unresolved balance mismatches across the fleet."
          fields={['Open alerts', 'Anchors affected', 'Largest delta', 'Oldest unresolved']}
        />
        <PlannedPanel
          title="Alert thresholds"
          description="Per-anchor rules the operator configured."
          fields={['alert_mismatch_pct', 'alert_large_tx', 'webhook_url']}
        />
      </div>

      <PlannedTable
        columns={['Anchor', 'Fiat balance', 'On-chain balance', 'Delta', 'Raised', 'Status']}
        note="No alerts — this console has no route to the control-plane yet."
      />
    </>
  );
}
