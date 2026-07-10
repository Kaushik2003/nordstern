'use client';

import { useRouter } from 'next/navigation';
import { useAdminData } from '@/lib/use-admin-data';
import { formatDate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge, TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface OrgRow {
  id: string; name: string; slug: string; website: string | null; country: string | null;
  teamSize: string | null; primaryGoal: string | null; status: string; createdAt: string;
  memberCount: number; anchorCount: number; projectCount: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { data, error, loading } = useAdminData<OrgRow[]>('/admin/organizations');

  if (loading && !data) return <Spinner label="Loading organizations…" />;
  const orgs = data ?? [];

  return (
    <>
      <PageHeader
        title="Organizations"
        description="The tenant boundary. Every anchor, key, and secret is scoped to one of these."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Suspended" value={orgs.filter((o) => o.status === 'suspended').length} />
        <StatCard label="Operators" value={orgs.reduce((sum, o) => sum + o.memberCount, 0)} />
      </div>

      <TableShell>
        <Thead>
          <Th>Organization</Th><Th>Country</Th><Th>Team</Th><Th>Goal</Th>
          <Th align="right">Members</Th><Th align="right">Anchors</Th>
          <Th>Status</Th><Th align="right">Created</Th>
        </Thead>
        <tbody>
          {orgs.length === 0 && <EmptyRow colSpan={8}>No organizations yet.</EmptyRow>}
          {orgs.map((o) => (
            <Tr key={o.id} onClick={() => router.push(`/organizations/${o.id}`)}>
              <Td>
                <div className="font-medium">{o.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{o.slug}</div>
              </Td>
              <Td className="text-muted-foreground">{o.country ?? '—'}</Td>
              <Td className="text-muted-foreground">{o.teamSize ?? '—'}</Td>
              <Td className="text-muted-foreground">{o.primaryGoal ?? '—'}</Td>
              <Td align="right" className="tabular-nums">{o.memberCount}</Td>
              <Td align="right" className="tabular-nums">{o.anchorCount}</Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </>
  );
}
