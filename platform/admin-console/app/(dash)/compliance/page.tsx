'use client';

import { PageHeader } from '@/components/primitives';
import { PlannedPanel, PlannedTable, ScaffoldNotice, StateBadge } from '@/components/scaffold';

// TIER 2 — per-anchor business servers hold this, one hop further than the control-plane.
//
// Compliance framing rule (AGENTS.md §5): nothing on this page may render a legal conclusion.
// `fiu_registration_status` is a field a founder recorded about themselves, not a verdict
// NordStern has reached, and the UI must never imply otherwise.
export default function CompliancePage() {
  return (
    <>
      <PageHeader
        title="Compliance"
        description="Cases, transaction oversight, and recorded regulatory posture per anchor."
        actions={<StateBadge state="unwired" />}
      />

      <ScaffoldNotice
        state="unwired"
        source="each anchor's business server (`/compliance/cases`, `/compliance/audit`) and the control-plane `tenants` table for recorded registration fields"
        needs="a fan-out proxy on platform-api that resolves each active anchor's business-server URL and aggregates the responses — one hop beyond the control-plane proxy"
      />

      <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm">
        <div className="font-medium">This console does not render legal conclusions</div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Fields such as FIU-IND registration status are values a founder supplied about their own entity.
          They are displayed as recorded data, never as a determination that an anchor is or is not compliant.
          Whether NordStern or the anchor is the registering entity remains an open question for counsel —
          see <code className="font-mono">docs/project/COMPLIANCE_OPEN_QUESTIONS.md</code>.
        </p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <PlannedPanel
          title="Open cases"
          description="Flagged transactions and customers awaiting review."
          fields={['Open cases', 'Escalated', 'Median age', 'Closed this month']}
        />
        <PlannedPanel
          title="Transaction oversight"
          description="Deposit and withdrawal flow across the fleet."
          fields={['Deposits (24h)', 'Withdrawals (24h)', 'Stuck transactions', 'Total volume']}
        />
        <PlannedPanel
          title="Recorded posture"
          description="Self-reported registration fields, per anchor."
          fields={['fiu_registration_status', 'legal_entity_name', 'company_type', 'country']}
        />
      </div>

      <PlannedTable
        columns={['Anchor', 'Case', 'Customer', 'Type', 'Raised', 'Status']}
        note="No cases — this console cannot reach the per-anchor business servers yet."
      />
    </>
  );
}
