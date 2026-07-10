'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@nordstern/shared-auth';
import { Badge, Button } from '@nordstern/shared-ui';
import { Check, ChevronRight, Copy, Loader2, RefreshCw, X } from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge,
  TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';
import { ApplicationDrawer, type Application, type Invitation } from '@/components/application-drawer';

interface ApproveResult { applicationId: string; email: string; rawToken: string }

/** An approved application's invitation can be redeemed, still waiting, or lapsed. */
function inviteState(invite: Invitation | undefined) {
  if (!invite) return null;
  if (invite.usedAt) return <Badge variant="success">Redeemed</Badge>;
  if (new Date(invite.expiresAt) < new Date()) return <Badge variant="warning">Invite expired</Badge>;
  return <Badge variant="outline">Awaiting redemption</Badge>;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApproveResult | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, i] = await Promise.all([
        api.get<Application[]>('/admin/applications'),
        api.get<Invitation[]>('/admin/invitations'),
      ]);
      setApps(a); setInvites(i); setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const inviteByApp = new Map(invites.map((i) => [i.applicationId, i]));

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id); setError('');
    try {
      if (action === 'approve') {
        const res = await api.post<ApproveResult>(`/admin/applications/${id}/approve`);
        setSelectedId(null); // close the drawer so the one-time redeem link is unobstructed
        setApproved(res); setCopied(false);
      } else {
        await api.post(`/admin/applications/${id}/reject`);
        setSelectedId(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${action} failed`);
    } finally { setBusyId(null); }
  }

  // /redeem lives on the founder console (register.nordstern.live), a different origin
  // from admin. Build the link against the founder base URL; fall back to same-origin for
  // single-host dev parity.
  const founderBase = process.env.NEXT_PUBLIC_FOUNDER_URL
    || (typeof window !== 'undefined' ? window.location.origin : '');
  const redeemLink = approved ? `${founderBase}/redeem?token=${approved.rawToken}` : '';

  async function copyLink() {
    await navigator.clipboard.writeText(redeemLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading && apps.length === 0) return <Spinner label="Loading applications…" />;

  const pending = apps.filter((a) => a.status === 'applied').length;
  const stale = invites.filter((i) => !i.usedAt && new Date(i.expiresAt) < new Date()).length;
  const selected = apps.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Anchor applications"
        description="Businesses applying to run a NordStern anchor. Select a row to review the full submission; approving mints a one-time invitation."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Pending review" value={pending} tone={pending > 0 ? 'warn' : 'default'} />
        <StatCard label="Approved" value={apps.filter((a) => a.status === 'approved').length} tone="success" />
        <StatCard label="Rejected" value={apps.filter((a) => a.status === 'rejected').length} />
        <StatCard label="Invites expired unused" value={stale} tone={stale > 0 ? 'warn' : 'default'} />
      </div>

      <TableShell>
        <Thead>
          <Th>Business</Th><Th>Contact</Th><Th>Mode</Th><Th>Status</Th>
          <Th>Invitation</Th><Th>Applied</Th><Th align="right">Actions</Th>
        </Thead>
        <tbody>
          {apps.length === 0 && <EmptyRow colSpan={7}>No applications yet.</EmptyRow>}
          {apps.map((a) => {
            const p = a.profile ?? {};
            const mode = a.product?.mode ?? 'test';
            const invite = inviteByApp.get(a.id);

            return (
              <Tr key={a.id} onClick={() => setSelectedId(a.id)}>
                <Td>
                  <div className="font-medium">{p.legalEntityName || <span className="text-muted-foreground">Unnamed</span>}</div>
                  <div className="text-xs text-muted-foreground">{p.businessEmail || '—'}</div>
                </Td>
                <Td>
                  <div>{p.contactPerson || '—'}</div>
                  <div className="text-xs text-muted-foreground">{p.country || '—'}</div>
                </Td>
                <Td><Badge variant={mode === 'production' ? 'warning' : 'outline'}>{mode}</Badge></Td>
                <Td><StatusBadge status={a.status} /></Td>
                <Td>{inviteState(invite) ?? <span className="text-muted-foreground">—</span>}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(a.createdAt)}</Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {a.status === 'applied' ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => act(a.id, 'reject')} className="hover:bg-destructive hover:text-white hover:border-destructive transition-colors duration-200">
                          Reject
                        </Button>
                        <Button size="sm" disabled={busyId === a.id} onClick={() => act(a.id, 'approve')} className="bg-brand text-white hover:bg-success hover:text-white transition-colors duration-200">
                          {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {a.status === 'approved' ? 'Invited' : 'Closed'}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableShell>

      {/* Full submission review — slide-over on the right. */}
      {selected && (
        <ApplicationDrawer
          app={selected}
          invite={inviteByApp.get(selected.id)}
          busy={busyId === selected.id}
          onApprove={() => act(selected.id, 'approve')}
          onReject={() => act(selected.id, 'reject')}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* One-time redeem link — shown only right after approval (the raw token is never stored). */}
      {approved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setApproved(null)}>
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <h2 className="text-base font-semibold">Application approved</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setApproved(null)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              We&apos;ve emailed the activation link to <span className="font-medium text-foreground">{approved.email}</span>.
              The founder redeems it themselves — nothing more to do here.
            </p>
            {/* Ops fallback only: in dev (no email provider) or if the founder didn't receive it,
                the one-time link is here. It's the founder's job to redeem, on the founder host. */}
            <details className="rounded-lg border border-line bg-surface/60 p-2">
              <summary className="cursor-pointer select-none px-1 text-xs text-muted-foreground">
                Link didn&apos;t arrive? Copy it manually (one-time)
              </summary>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap px-1 text-xs">{redeemLink}</code>
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <><Check className="mr-1.5 h-3.5 w-3.5" />Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</>}
                </Button>
              </div>
            </details>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setApproved(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
