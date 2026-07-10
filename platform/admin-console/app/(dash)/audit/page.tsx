'use client';

import { useMemo, useState } from 'react';
import { Badge, Input } from '@nordstern/shared-ui';
import { Search } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { formatDateTime, humanizeAction, truncate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, JsonBlock, PageHeader, Spinner, TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface AuditRow {
  id: string; action: string; actorType: string | null;
  resourceType: string | null; resourceId: string | null;
  metadata: unknown; requestId: string | null;
  ip: string | null; userAgent: string | null; createdAt: string;
  actorEmail: string | null; organizationName: string | null;
}

export default function AuditPage() {
  const { data, error, loading } = useAdminData<AuditRow[]>('/admin/audit-logs');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.action, r.actorEmail, r.actorType, r.resourceType, r.organizationName, r.ip]
        .some((field) => field?.toLowerCase().includes(q)));
  }, [rows, query]);

  if (loading && !data) return <Spinner label="Loading audit log…" />;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of consequential actions. The 200 most recent entries."
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by action, actor, resource…"
              className="w-72 pl-8"
            />
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      <TableShell>
        <Thead>
          <Th>Action</Th><Th>Actor</Th><Th>Organization</Th>
          <Th>Resource</Th><Th>IP</Th><Th align="right">When</Th>
        </Thead>
        <tbody>
          {filtered.length === 0 && (
            <EmptyRow colSpan={6}>
              {rows.length === 0 ? 'No audit entries recorded yet.' : 'No entries match that filter.'}
            </EmptyRow>
          )}
          {filtered.map((r) => {
            const isOpen = expanded === r.id;
            return [
              <Tr key={r.id} onClick={() => setExpanded(isOpen ? null : r.id)}>
                <Td className="font-medium">{humanizeAction(r.action)}</Td>
                <Td>
                  <div className="text-muted-foreground">{r.actorEmail ?? '—'}</div>
                  {r.actorType && <Badge variant="outline">{r.actorType}</Badge>}
                </Td>
                <Td className="text-muted-foreground">{r.organizationName ?? '—'}</Td>
                <Td className="text-muted-foreground">
                  {r.resourceType ?? '—'}
                  {r.resourceId && <div className="font-mono text-xs">{truncate(r.resourceId, 8, 4)}</div>}
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">{r.ip ?? '—'}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt)}</Td>
              </Tr>,

              isOpen && (
                <tr key={`${r.id}-detail`} className="border-b border-line bg-surface/40">
                  <td colSpan={6} className="px-4 py-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metadata</div>
                        <JsonBlock value={r.metadata} />
                      </div>
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Request ID</dt>
                          <dd className="font-mono text-xs">{r.requestId ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Resource ID</dt>
                          <dd className="font-mono text-xs break-all">{r.resourceId ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">User agent</dt>
                          <dd className="text-xs text-muted-foreground break-words">{r.userAgent ?? '—'}</dd>
                        </div>
                      </dl>
                    </div>
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
