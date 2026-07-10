'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@nordstern/shared-ui';
import { RefreshCw } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { duration, formatDateTime, timeAgo } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, JsonBlock, PageHeader, Spinner, StatCard, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface Job {
  id: string; type: string; status: string; attempts: number;
  error: string | null; result: unknown;
  startedAt: string | null; finishedAt: string | null; createdAt: string;
  anchorId: string | null; anchorName: string | null; anchorSlug: string | null;
  organizationName: string | null;
}

export default function ProvisioningPage() {
  const { data, error, loading, reload } = useAdminData<Job[]>('/admin/provisioning-jobs');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading && !data) return <Spinner label="Loading provisioning jobs…" />;

  const jobs = data ?? [];
  const count = (status: string) => jobs.filter((j) => j.status === status).length;

  return (
    <>
      <PageHeader
        title="Provisioning"
        description="Every attempt to build an anchor's stack. Production-mode jobs stay pending until go-live review."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={jobs.length} />
        <StatCard label="Running" value={count('running')} />
        <StatCard label="Pending" value={count('pending')} hint="Includes production jobs awaiting review" />
        <StatCard label="Completed" value={count('completed')} tone="success" />
        <StatCard label="Failed" value={count('failed')} tone={count('failed') > 0 ? 'destructive' : 'default'} />
      </div>

      <TableShell>
        <Thead>
          <Th>Anchor</Th><Th>Type</Th><Th>Status</Th><Th align="right">Attempts</Th>
          <Th>Started</Th><Th>Duration</Th><Th align="right">Created</Th>
        </Thead>
        <tbody>
          {jobs.length === 0 && <EmptyRow colSpan={7}>No provisioning jobs recorded.</EmptyRow>}
          {jobs.map((j) => {
            const isOpen = expanded === j.id;
            return [
              <Tr key={j.id} onClick={() => setExpanded(isOpen ? null : j.id)}>
                <Td>
                  {j.anchorId
                    ? <Link href={`/anchors/${j.anchorId}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                        {j.anchorName ?? j.anchorSlug}
                      </Link>
                    : <span className="text-muted-foreground">—</span>}
                  <div className="text-xs text-muted-foreground">{j.organizationName ?? '—'}</div>
                </Td>
                <Td className="font-mono text-xs">{j.type}</Td>
                <Td><StatusBadge status={j.status} /></Td>
                <Td align="right" className="tabular-nums">{j.attempts}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDateTime(j.startedAt)}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{duration(j.startedAt, j.finishedAt)}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{timeAgo(j.createdAt)}</Td>
              </Tr>,

              isOpen && (
                <tr key={`${j.id}-detail`} className="border-b border-line bg-surface/40">
                  <td colSpan={7} className="px-4 py-5">
                    {j.error && (
                      <div className="mb-4 rounded-lg bg-destructive-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-destructive">Error</div>
                        <pre className="mt-1 overflow-x-auto text-xs text-destructive">{j.error}</pre>
                      </div>
                    )}
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</div>
                    <JsonBlock value={j.result} />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Retrying a failed job is a control-plane action and is not wired into this console yet.
                    </p>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </TableShell>
    </>
  );
}
