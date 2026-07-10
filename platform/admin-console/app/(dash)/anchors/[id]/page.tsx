'use client';

import Link from 'next/link';
import { use } from 'react';
import { Badge } from '@nordstern/shared-ui';
import { ArrowLeft } from 'lucide-react';
import { useAdminData } from '@/lib/use-admin-data';
import { duration, formatDateTime } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, Field, JsonBlock, PageHeader, Section, Spinner, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';
import { PlannedPanel, ScaffoldNotice } from '@/components/scaffold';

interface Job {
  id: string; type: string; status: string; attempts: number;
  error: string | null; payload: unknown; result: unknown;
  startedAt: string | null; finishedAt: string | null; createdAt: string;
}

interface SecretRef {
  id: string; provider: string; secretProvider: string; secretPath: string;
  keyNames: string[]; lastRotatedAt: string | null; createdAt: string;
}

interface AnchorDetail {
  id: string; name: string; slug: string; status: string; network: string;
  branding: Record<string, string>; createdAt: string; updatedAt: string;
  organizationId: string; organizationName: string | null; organizationSlug: string | null;
  projectName: string | null; environment: string | null;
  jobs: Job[]; secrets: SecretRef[];
}

export default function AnchorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: anchor, error, loading } = useAdminData<AnchorDetail>(`/admin/anchors/${id}`);

  if (loading && !anchor) return <Spinner label="Loading anchor…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!anchor) return null;

  return (
    <>
      <Link href="/anchors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />All anchors
      </Link>

      <PageHeader
        title={anchor.name}
        description={<span className="font-mono text-xs">{anchor.slug}</span>}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={anchor.status} />
            <Badge variant={anchor.network === 'mainnet' ? 'warning' : 'outline'}>{anchor.network}</Badge>
          </div>
        }
      />

      <Section title="Identity">
        <div className="rounded-xl border border-line bg-background p-5">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Field label="Organization">
              <Link href={`/organizations/${anchor.organizationId}`} className="hover:underline">
                {anchor.organizationName ?? '—'}
              </Link>
            </Field>
            <Field label="Project">{anchor.projectName ?? '—'}</Field>
            <Field label="Environment">{anchor.environment ?? '—'}</Field>
            <Field label="Anchor ID" mono>{anchor.id}</Field>
            <Field label="Created">{formatDateTime(anchor.createdAt)}</Field>
            <Field label="Updated">{formatDateTime(anchor.updatedAt)}</Field>
          </dl>
        </div>
      </Section>

      <Section title="Branding" description="White-label identity the founder configured at redemption.">
        <div className="rounded-xl border border-line bg-background p-5">
          {Object.keys(anchor.branding ?? {}).length === 0
            ? <p className="text-sm text-muted-foreground">No branding set — the anchor renders with platform defaults.</p>
            : <JsonBlock value={anchor.branding} />}
        </div>
      </Section>

      <Section
        title="Provisioning history"
        description="Every attempt to build this anchor's container stack, newest first."
      >
        <TableShell>
          <Thead>
            <Th>Type</Th><Th>Status</Th><Th>Attempts</Th><Th>Started</Th>
            <Th>Duration</Th><Th align="right">Error</Th>
          </Thead>
          <tbody>
            {anchor.jobs.length === 0 && <EmptyRow colSpan={6}>No provisioning jobs recorded.</EmptyRow>}
            {anchor.jobs.map((job) => (
              <Tr key={job.id}>
                <Td className="font-mono text-xs">{job.type}</Td>
                <Td><StatusBadge status={job.status} /></Td>
                <Td className="tabular-nums">{job.attempts}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDateTime(job.startedAt)}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{duration(job.startedAt, job.finishedAt)}</Td>
                <Td align="right" className="max-w-sm truncate text-xs text-destructive" title={job.error ?? ''}>
                  {job.error ?? '—'}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section
        title="Payment credentials"
        description="Metadata only. Values live in the SecretStore and are never read by this console."
      >
        <TableShell>
          <Thead>
            <Th>Provider</Th><Th>Store</Th><Th>Secret path</Th><Th>Keys set</Th><Th align="right">Last rotated</Th>
          </Thead>
          <tbody>
            {anchor.secrets.length === 0 && <EmptyRow colSpan={5}>No provider credentials registered.</EmptyRow>}
            {anchor.secrets.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.provider}</Td>
                <Td><Badge variant="outline">{s.secretProvider}</Badge></Td>
                <Td className="font-mono text-xs text-muted-foreground">{s.secretPath}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {(s.keyNames ?? []).map((k) => (
                      <code key={k} className="rounded bg-surface px-1.5 py-0.5 text-xs">{k}</code>
                    ))}
                    {(s.keyNames ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                  </div>
                </Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">
                  {s.lastRotatedAt ? formatDateTime(s.lastRotatedAt) : 'Never'}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section title="Runtime detail" description="The rest of this anchor's state lives outside the platform database.">
        <ScaffoldNotice
          state="unwired"
          source="control-plane `tenants` table (:3002) and the aggregator (:3005)"
          needs="a service-token proxy from platform-api to the control-plane, mirroring provisioner.service.ts"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <PlannedPanel
            title="Stack status"
            description="The live provisioning narrative and container identifiers."
            fields={['stack_status', 'status_detail', 'ap_container_id', 'biz_container_id', 'home_domain']}
          />
          <PlannedPanel
            title="Issued asset"
            description="The Stellar asset this anchor issues on-chain."
            fields={['asset_code', 'asset_issuer', 'distribution account', 'trustlines']}
          />
          <PlannedPanel
            title="Business rules"
            description="Limits and fees the operator configured in their own console."
            fields={['min / max deposit', 'min / max withdrawal', 'daily limit', 'deposit fee %', 'withdrawal fee %', 'settlement days']}
          />
        </div>
      </Section>
    </>
  );
}
