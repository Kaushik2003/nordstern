'use client';

import Link from 'next/link';
import { Button } from '@nordstern/shared-ui';
import { RefreshCw } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { humanizeAction, timeAgo } from '@/lib/format';
import {
  ErrorBanner, PageHeader, Section, Spinner, StatCard, TableShell, Td, Th, Thead, Tr, EmptyRow,
} from '@/components/primitives';

interface Overview {
  applications: Record<string, number>;
  anchors: Record<string, number>;
  provisioningJobs: Record<string, number>;
  customerKyc: Record<string, number>;
  totals: { organizations: number; users: number; customers: number; wallets: number; activeApiKeys: number };
  recentActivity: {
    id: string; action: string; actorType: string | null; resourceType: string | null;
    createdAt: string; actorEmail: string | null;
  }[];
}

const n = (map: Record<string, number> | undefined, key: string) => map?.[key] ?? 0;
const total = (map: Record<string, number> | undefined) => Object.values(map ?? {}).reduce((a, b) => a + b, 0);

export default function OverviewPage() {
  const { data, error, loading, reload } = useAdminData<Overview>('/admin/overview');

  if (loading && !data) return <Spinner label="Loading platform state…" />;

  const pendingApps = n(data?.applications, 'applied');
  const failedJobs = n(data?.provisioningJobs, 'failed');
  const erroredAnchors = n(data?.anchors, 'error');

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every tenant, anchor, and application NordStern operates."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <Section title="Needs attention">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Applications pending"
            value={pendingApps}
            tone={pendingApps > 0 ? 'warn' : 'default'}
            hint="Awaiting approve or reject"
          />
          <StatCard
            label="Anchors in error"
            value={erroredAnchors}
            tone={erroredAnchors > 0 ? 'destructive' : 'default'}
            hint="Platform lifecycle status, not container health"
          />
          <StatCard
            label="Failed provisioning jobs"
            value={failedJobs}
            tone={failedJobs > 0 ? 'destructive' : 'default'}
            hint="Retryable from the control-plane"
          />
        </div>
      </Section>

      <Section title="Fleet" description="Anchor lifecycle across all organizations.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total anchors" value={total(data?.anchors)} />
          <StatCard label="Active" value={n(data?.anchors, 'active')} tone="success" />
          <StatCard label="Provisioning" value={n(data?.anchors, 'provisioning')} />
          <StatCard label="Draft" value={n(data?.anchors, 'draft')} />
          <StatCard label="Suspended" value={n(data?.anchors, 'suspended')} />
        </div>
      </Section>

      <Section title="Tenants & identity">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Organizations" value={data?.totals.organizations ?? 0} />
          <StatCard label="Operators" value={data?.totals.users ?? 0} />
          <StatCard label="Customers" value={data?.totals.customers ?? 0} />
          <StatCard label="Proven wallets" value={data?.totals.wallets ?? 0} />
          <StatCard label="Active API keys" value={data?.totals.activeApiKeys ?? 0} />
        </div>
      </Section>

      <Section
        title="Customer KYC"
        description="Real verification state from DIDIT — the anchors' end-users, across the platform."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Approved" value={n(data?.customerKyc, 'approved')} tone="success" />
          <StatCard label="Pending" value={n(data?.customerKyc, 'pending')} tone="warn" />
          <StatCard label="Declined" value={n(data?.customerKyc, 'declined')} />
          <StatCard label="Unverified" value={n(data?.customerKyc, 'unverified')} />
        </div>
      </Section>

      <Section
        title="Recent activity"
        description="Append-only audit trail."
        actions={<Link href="/audit" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>}
      >
        <TableShell>
          <Thead>
            <Th>Action</Th><Th>Actor</Th><Th>Resource</Th><Th align="right">When</Th>
          </Thead>
          <tbody>
            {(data?.recentActivity.length ?? 0) === 0 && <EmptyRow colSpan={4}>No activity recorded yet.</EmptyRow>}
            {data?.recentActivity.map((entry) => (
              <Tr key={entry.id}>
                <Td className="font-medium">{humanizeAction(entry.action)}</Td>
                <Td className="text-muted-foreground">{entry.actorEmail ?? entry.actorType ?? 'system'}</Td>
                <Td className="text-muted-foreground">{entry.resourceType ?? '—'}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{timeAgo(entry.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>
    </>
  );
}
