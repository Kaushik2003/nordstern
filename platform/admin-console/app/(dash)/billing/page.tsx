'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 3 — no backend. There is no billing table, no revenue ledger, no plan model anywhere
// in the platform. This page is a design placeholder so the shape is agreed before anything
// is built. Nothing here can be "wired up"; it has to be designed and persisted first.
export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="What each anchor owes NordStern, and what NordStern earned."
        actions={<StateBadge state="no-backend" />}
      />

      <ScaffoldNotice
        state="no-backend"
        source="nowhere — no billing, plan, invoice, or revenue table exists in any service"
        needs="a revenue model decision first (per-anchor subscription? basis points on volume?), then schema, a metering pipeline off transaction volume, and a payment processor for collection"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <PlannedPanel
          title="Platform revenue"
          description="Aggregate across all tenants."
          fields={['MRR', 'Revenue this month', 'Outstanding invoices', 'Churned tenants']}
        />
        <PlannedPanel
          title="Per-anchor metering"
          description="Whatever the priced unit turns out to be."
          fields={['Transaction volume', 'Transaction count', 'Active customers', 'Overage']}
        />
        <PlannedPanel
          title="Plan"
          description="Subscription tier and its entitlements."
          fields={['Plan', 'Seats', 'Included volume', 'Renewal date']}
        />
      </div>

      <PlannedTable
        columns={['Organization', 'Plan', 'Volume this period', 'Amount due', 'Status', 'Next invoice']}
        note="Nothing to show — billing does not exist as a concept in the platform yet."
      />
    </>
  );
}
