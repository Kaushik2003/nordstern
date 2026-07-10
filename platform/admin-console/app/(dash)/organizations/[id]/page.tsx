'use client';

import Link from 'next/link';
import { use } from 'react';
import { Badge } from '@nordstern/shared-ui';
import { ArrowLeft } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, Field, PageHeader, Section, Spinner, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface OrgDetail {
  id: string; name: string; slug: string; website: string | null; country: string | null;
  teamSize: string | null; primaryGoal: string | null; status: string; createdAt: string;
  members: {
    id: string; role: string; createdAt: string; userId: string;
    email: string; fullName: string | null; lastLoginAt: string | null; userStatus: string;
  }[];
  projects: { id: string; name: string; slug: string; environment: string; createdAt: string }[];
  anchors: { id: string; name: string; slug: string; status: string; network: string }[];
  apiKeys: {
    id: string; name: string; keyPrefix: string; last4: string;
    scopes: string[]; status: string; lastUsedAt: string | null;
  }[];
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: org, error, loading } = useAdminData<OrgDetail>(`/admin/organizations/${id}`);

  if (loading && !org) return <Spinner label="Loading organization…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!org) return null;

  return (
    <>
      <Link href="/organizations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />All organizations
      </Link>

      <PageHeader
        title={org.name}
        description={<span className="font-mono text-xs">{org.slug}</span>}
        actions={<StatusBadge status={org.status} />}
      />

      <Section title="Profile">
        <div className="rounded-xl border border-line bg-background p-5">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Field label="Website">
              {org.website
                ? <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline">{org.website}</a>
                : '—'}
            </Field>
            <Field label="Country">{org.country ?? '—'}</Field>
            <Field label="Team size">{org.teamSize ?? '—'}</Field>
            <Field label="Primary goal">{org.primaryGoal ?? '—'}</Field>
            <Field label="Organization ID" mono>{org.id}</Field>
            <Field label="Created">{formatDateTime(org.createdAt)}</Field>
          </dl>
        </div>
      </Section>

      <Section title="Members">
        <TableShell>
          <Thead><Th>Operator</Th><Th>Role</Th><Th>Account</Th><Th align="right">Last login</Th></Thead>
          <tbody>
            {org.members.length === 0 && <EmptyRow colSpan={4}>No members.</EmptyRow>}
            {org.members.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <div className="font-medium">{m.fullName ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </Td>
                <Td><Badge variant={m.role === 'owner' ? 'brand' : 'outline'}>{m.role}</Badge></Td>
                <Td><StatusBadge status={m.userStatus} /></Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(m.lastLoginAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section title="Anchors">
        <TableShell>
          <Thead><Th>Anchor</Th><Th>Slug</Th><Th>Network</Th><Th align="right">Status</Th></Thead>
          <tbody>
            {org.anchors.length === 0 && <EmptyRow colSpan={4}>No anchors.</EmptyRow>}
            {org.anchors.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <Link href={`/anchors/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">{a.slug}</Td>
                <Td><Badge variant={a.network === 'mainnet' ? 'warning' : 'outline'}>{a.network}</Badge></Td>
                <Td align="right"><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section title="Projects" description="Environment containers created at onboarding.">
        <TableShell>
          <Thead><Th>Project</Th><Th>Slug</Th><Th align="right">Environment</Th></Thead>
          <tbody>
            {org.projects.length === 0 && <EmptyRow colSpan={3}>No projects.</EmptyRow>}
            {org.projects.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{p.slug}</Td>
                <Td align="right">
                  <Badge variant={p.environment === 'production' ? 'warning' : 'outline'}>{p.environment}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section title="API keys" description="Prefix and last four only — the secret is stored hashed.">
        <TableShell>
          <Thead><Th>Name</Th><Th>Key</Th><Th>Scopes</Th><Th>Status</Th><Th align="right">Last used</Th></Thead>
          <tbody>
            {org.apiKeys.length === 0 && <EmptyRow colSpan={5}>No API keys issued.</EmptyRow>}
            {org.apiKeys.map((k) => (
              <Tr key={k.id}>
                <Td className="font-medium">{k.name}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…{k.last4}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(k.scopes ?? []).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  </div>
                </Td>
                <Td><StatusBadge status={k.status} /></Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(k.lastUsedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>
    </>
  );
}
