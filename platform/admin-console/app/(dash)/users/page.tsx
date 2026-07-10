'use client';

import { useAdminData } from '@/lib/use-admin-data';
import { formatDate, formatDateTime, timeAgo, truncate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Section, Spinner, StatCard, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface UserRow {
  id: string; email: string; fullName: string | null; status: string;
  lastLoginAt: string | null; createdAt: string;
  orgCount: number; activeSessions: number;
}

interface SessionRow {
  id: string; userAgent: string | null; ip: string | null;
  lastUsedAt: string; expiresAt: string; email: string; organizationName: string | null;
}

export default function UsersPage() {
  const users = useAdminData<UserRow[]>('/admin/users');
  const sessions = useAdminData<SessionRow[]>('/admin/sessions');

  if (users.loading && !users.data) return <Spinner label="Loading operators…" />;

  const rows = users.data ?? [];
  const live = sessions.data ?? [];

  return (
    <>
      <PageHeader
        title="Operators"
        description="Founders and staff who sign in to run an anchor. Authentication is email + OTP — there are no passwords to reset."
      />

      {users.error && <ErrorBanner message={users.error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Operators" value={rows.length} />
        <StatCard label="Suspended" value={rows.filter((u) => u.status === 'suspended').length} />
        <StatCard label="Signed in now" value={live.length} hint="Un-revoked, unexpired sessions" />
      </div>

      <Section title="Accounts">
        <TableShell>
          <Thead>
            <Th>Operator</Th><Th>Status</Th><Th align="right">Orgs</Th>
            <Th align="right">Sessions</Th><Th>Last login</Th><Th align="right">Joined</Th>
          </Thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={6}>No operators yet.</EmptyRow>}
            {rows.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="font-medium">{u.fullName ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td align="right" className="tabular-nums">{u.orgCount}</Td>
                <Td align="right" className="tabular-nums">{u.activeSessions}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.lastLoginAt)}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section title="Active sessions" description="Most recently used first. Revoking a session is not wired into this console yet.">
        <TableShell>
          <Thead>
            <Th>Operator</Th><Th>Organization</Th><Th>IP</Th><Th>Client</Th>
            <Th>Last used</Th><Th align="right">Expires</Th>
          </Thead>
          <tbody>
            {live.length === 0 && <EmptyRow colSpan={6}>No active sessions.</EmptyRow>}
            {live.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.email}</Td>
                <Td className="text-muted-foreground">{s.organizationName ?? '—'}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{s.ip ?? '—'}</Td>
                <Td className="max-w-xs truncate text-xs text-muted-foreground" title={s.userAgent ?? ''}>
                  {truncate(s.userAgent, 40, 0)}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">{timeAgo(s.lastUsedAt)}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.expiresAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>
    </>
  );
}
