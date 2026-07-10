'use client';

import { Badge } from '@nordstern/shared-ui';
import { ShieldCheck } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { formatDate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Section, Spinner, StatCard, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface Credentials {
  apiKeys: {
    id: string; name: string; keyPrefix: string; last4: string; scopes: string[];
    status: string; lastUsedAt: string | null; expiresAt: string | null; createdAt: string;
    organizationName: string | null; projectName: string | null; createdByEmail: string | null;
  }[];
  secretRefs: {
    id: string; slug: string; provider: string; secretProvider: string; secretPath: string;
    keyNames: string[]; lastRotatedAt: string | null; createdAt: string;
    organizationName: string | null; anchorName: string | null;
  }[];
}

export default function CredentialsPage() {
  const { data, error, loading } = useAdminData<Credentials>('/admin/credentials');

  if (loading && !data) return <Spinner label="Loading credential inventory…" />;

  const keys = data?.apiKeys ?? [];
  const refs = data?.secretRefs ?? [];
  const activeKeys = keys.filter((k) => k.status === 'active').length;
  const neverRotated = refs.filter((r) => !r.lastRotatedAt).length;

  return (
    <>
      <PageHeader
        title="Credentials"
        description="An inventory, not a vault. Secret values live in the SecretStore and are never read by this console."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-background p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-sm text-muted-foreground">
          API keys are stored hashed — only the prefix and last four characters exist in the database.
          Payment-provider credentials are recorded as references: which keys are set and when they were
          last rotated, never their contents.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="API keys" value={keys.length} />
        <StatCard label="Active" value={activeKeys} tone="success" />
        <StatCard label="Provider credentials" value={refs.length} />
        <StatCard label="Never rotated" value={neverRotated} tone={neverRotated > 0 ? 'warn' : 'default'} />
      </div>

      <Section title="API keys">
        <TableShell>
          <Thead>
            <Th>Name</Th><Th>Key</Th><Th>Organization</Th><Th>Scopes</Th>
            <Th>Status</Th><Th>Created by</Th><Th align="right">Last used</Th>
          </Thead>
          <tbody>
            {keys.length === 0 && <EmptyRow colSpan={7}>No API keys issued.</EmptyRow>}
            {keys.map((k) => (
              <Tr key={k.id}>
                <Td className="font-medium">{k.name}</Td>
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">{k.keyPrefix}…{k.last4}</Td>
                <Td className="text-muted-foreground">
                  {k.organizationName ?? '—'}
                  {k.projectName && <div className="text-xs">{k.projectName}</div>}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(k.scopes ?? []).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    {(k.scopes ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                  </div>
                </Td>
                <Td><StatusBadge status={k.status} /></Td>
                <Td className="text-xs text-muted-foreground">{k.createdByEmail ?? '—'}</Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(k.lastUsedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section
        title="Provider credentials"
        description="Razorpay, Cashfree, DIDIT and treasury references, one row per anchor and provider."
      >
        <TableShell>
          <Thead>
            <Th>Provider</Th><Th>Anchor</Th><Th>Store</Th>
            <Th>Secret path</Th><Th>Keys set</Th><Th align="right">Last rotated</Th>
          </Thead>
          <tbody>
            {refs.length === 0 && <EmptyRow colSpan={6}>No provider credentials registered.</EmptyRow>}
            {refs.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium">{r.provider}</Td>
                <Td className="text-muted-foreground">
                  {r.anchorName ?? r.slug}
                  <div className="text-xs">{r.organizationName ?? '—'}</div>
                </Td>
                <Td><Badge variant="outline">{r.secretProvider}</Badge></Td>
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">{r.secretPath}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(r.keyNames ?? []).map((k) => (
                      <code key={k} className="rounded bg-surface px-1.5 py-0.5 text-xs">{k}</code>
                    ))}
                    {(r.keyNames ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                  </div>
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {r.lastRotatedAt
                    ? <span className="text-muted-foreground">{formatDate(r.lastRotatedAt)}</span>
                    : <span className="text-warn">Never</span>}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>
    </>
  );
}
