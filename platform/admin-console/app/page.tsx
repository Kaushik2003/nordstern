'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@nordstern/shared-auth';
import { Button } from '@nordstern/shared-ui';
import { Badge } from '@nordstern/shared-ui';
import { Loader2, LogOut, Copy, Check, RefreshCw, ShieldCheck, Inbox } from 'lucide-react';

interface Application {
  id: string;
  profile: Record<string, any>;
  product: Record<string, any>;
  status: string;
  createdAt: string;
}

interface ApproveResult { applicationId: string; email: string; rawToken: string }

function statusBadge(status: string) {
  if (status === 'approved') return <Badge variant="success">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="warning">Rejected</Badge>;
  return <Badge variant="brand">Applied</Badge>;
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApproveResult | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const list = await api.get<Application[]>('/admin/applications');
    setApps(list);
  }, []);

  // Guard: verify the admin session, then load. On 401 → the login page.
  useEffect(() => {
    (async () => {
      try {
        await api.get('/admin/me');
        await load();
        setReady(true);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router, load]);

  async function approve(id: string) {
    setBusyId(id); setError('');
    try {
      const res = await api.post<ApproveResult>(`/admin/applications/${id}/approve`);
      setApproved(res); setCopied(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approve failed');
    } finally { setBusyId(null); }
  }

  async function reject(id: string) {
    setBusyId(id); setError('');
    try {
      await api.post(`/admin/applications/${id}/reject`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reject failed');
    } finally { setBusyId(null); }
  }

  async function signOut() {
    try { await api.post('/admin/logout'); } catch { /* ignore */ }
    router.replace('/login');
  }

  // /redeem lives on the founder console (register.nordstern.live), a different origin
  // from admin. Build the link against the founder base URL; fall back to same-origin for
  // single-host dev parity.
  const founderBase =
    process.env.NEXT_PUBLIC_FOUNDER_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const redeemLink = approved ? `${founderBase}/redeem?token=${approved.rawToken}` : '';

  async function copyLink() {
    await navigator.clipboard.writeText(redeemLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = apps.filter((a) => a.status === 'applied').length;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">NordStern Admin</div>
            <div className="text-xs text-muted-foreground">Application review</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Anchor applications</h1>
          <p className="text-sm text-muted-foreground">{pending} pending review · {apps.length} total</p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    No applications yet.
                  </td></tr>
                )}
                {apps.map((a) => {
                  const p = a.profile || {};
                  const mode = a.product?.mode ?? 'test';
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.legalEntityName || <span className="text-muted-foreground">Unnamed</span>}</div>
                        <div className="text-xs text-muted-foreground">{p.businessEmail || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{p.contactPerson || '—'}</div>
                        <div className="text-xs text-muted-foreground">{p.country || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={mode === 'production' ? 'warning' : 'outline'}>{mode}</Badge>
                      </td>
                      <td className="px-4 py-3">{statusBadge(a.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {a.status === 'applied' ? (
                            <>
                              <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => reject(a.id)}>Reject</Button>
                              <Button size="sm" disabled={busyId === a.id} onClick={() => approve(a.id)}>
                                {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">{a.status === 'approved' ? 'Invited' : 'Closed'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* One-time redeem link — shown only right after approval (the raw token is never stored). */}
      {approved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setApproved(null)}>
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold">Application approved</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              We&apos;ve emailed the activation link to <span className="font-medium text-foreground">{approved.email}</span>.
              The founder redeems it themselves — nothing more to do here.
            </p>
            {/* Ops fallback only: in dev (no email provider) or if the founder didn't receive it,
                the one-time link is here. It's the founder's job to redeem, on the founder host. */}
            <details className="rounded-lg border bg-muted/30 p-2">
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
    </div>
  );
}
