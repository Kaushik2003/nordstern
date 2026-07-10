'use client';

import { useRouter } from 'next/navigation';
import { Badge, Button } from '@nordstern/shared-ui';
import { RefreshCw } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { formatDate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge, TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface AnchorRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  network: string;
  createdAt: string;
  organizationName: string | null;
  projectName: string | null;
  environment: string | null;
  latestJobStatus: string | null;
  latestJobError: string | null;
}

export default function AnchorsPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useAdminData<AnchorRow[]>('/admin/anchors');

  if (loading && !data) return <Spinner label="Loading fleet…" />;

  const anchors = data ?? [];
  const count = (status: string) => anchors.filter((a) => a.status === status).length;

  return (
    <>
      <PageHeader
        title="Anchors"
        description="Every anchor across every organization. Status is the platform lifecycle value — container health lives in the control-plane and is not wired up here yet."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={anchors.length} />
        <StatCard label="Active" value={count('active')} tone="success" />
        <StatCard label="Provisioning" value={count('provisioning')} />
        <StatCard label="Error" value={count('error')} tone={count('error') > 0 ? 'destructive' : 'default'} />
      </div>

      <TableShell>
        <Thead>
          <Th>Anchor</Th><Th>Organization</Th><Th>Environment</Th><Th>Network</Th>
          <Th>Status</Th><Th>Last provisioning</Th><Th align="right">Created</Th>
        </Thead>
        <tbody>
          {anchors.length === 0 && (
            <EmptyRow colSpan={7}>
              No anchors yet. One is created when a founder redeems an approved invitation.
            </EmptyRow>
          )}
          {anchors.map((a) => (
            <Tr key={a.id} onClick={() => router.push(`/anchors/${a.id}`)}>
              <Td>
                <div className="font-medium">{a.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{a.slug}</div>
              </Td>
              <Td className="text-muted-foreground">{a.organizationName ?? '—'}</Td>
              <Td>
                {a.environment
                  ? <Badge variant={a.environment === 'production' ? 'warning' : 'outline'}>{a.environment}</Badge>
                  : <span className="text-muted-foreground">—</span>}
              </Td>
              <Td>
                <Badge variant={a.network === 'mainnet' ? 'warning' : 'outline'}>{a.network}</Badge>
              </Td>
              <Td><StatusBadge status={a.status} /></Td>
              <Td>
                <StatusBadge status={a.latestJobStatus} />
                {a.latestJobError && (
                  <div className="mt-1 max-w-xs truncate text-xs text-destructive" title={a.latestJobError}>
                    {a.latestJobError}
                  </div>
                )}
              </Td>
              <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </>
  );
}
