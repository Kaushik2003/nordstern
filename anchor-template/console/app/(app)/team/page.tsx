'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, X, Mail } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAnchor } from '@/components/anchor-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

interface Member { id: string; role: string; userId: string; email: string; fullName: string | null }
interface Invitation { id: string; email: string; role: string; status: string }
const ROLES = ['owner', 'admin', 'member', 'billing'];

export default function TeamPage() {
  const { orgId, role: myRole, loading } = useAnchor();
  const qc = useQueryClient();
  const canManage = myRole === 'owner' || myRole === 'admin';
  const [inviting, setInviting] = useState(false);

  const members = useQuery({ queryKey: ['members', orgId], queryFn: () => api.get<Member[]>(`/organizations/${orgId}/members`), enabled: !!orgId });
  const invites = useQuery({ queryKey: ['invites', orgId], queryFn: () => api.get<Invitation[]>(`/organizations/${orgId}/invitations`), enabled: !!orgId });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/organizations/${orgId}/members/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', orgId] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/organizations/${orgId}/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', orgId] }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/organizations/${orgId}/invitations/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', orgId] }),
  });

  const pending = (invites.data ?? []).filter((i) => i.status === 'pending');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Team</h1>
          <p className="text-sm text-subtle">People who can access this anchor&apos;s console.</p>
        </div>
        {canManage && <Button variant="brand" size="sm" onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" /> Invite</Button>}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading || members.isLoading ? (
            <div className="space-y-2 p-4">{[0,1].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead><TR className="border-line"><TH className="pl-4">Member</TH><TH>Role</TH><TH></TH></TR></THead>
                <TBody>
                  {(members.data ?? []).map((m) => (
                    <TR key={m.id}>
                      <TD className="pl-4"><div><p className="font-medium text-ink">{m.fullName ?? m.email}</p><p className="text-xs text-subtle">{m.email}</p></div></TD>
                      <TD>
                        {canManage ? (
                          <select value={m.role} onChange={(e) => setRole.mutate({ id: m.id, role: e.target.value })} className="rounded-md border border-input bg-background px-2 py-1 text-sm capitalize text-ink outline-none">
                            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                          </select>
                        ) : <Badge tone="neutral">{m.role}</Badge>}
                      </TD>
                      <TD>{canManage && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remove ${m.email}?`)) remove.mutate(m.id); }}><Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" /></Button></div>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pending invitations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-ink"><Mail className="h-3.5 w-3.5 text-subtle" />{i.email}</span>
                <div className="flex items-center gap-2"><Badge tone="warning">{i.role}</Badge>{canManage && <Button variant="ghost" size="sm" onClick={() => revoke.mutate(i.id)}>Revoke</Button>}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {inviting && <InviteDialog orgId={orgId!} onClose={() => setInviting(false)} onDone={() => { setInviting(false); qc.invalidateQueries({ queryKey: ['invites', orgId] }); }} />}
    </div>
  );
}

function InviteDialog({ orgId, onClose, onDone }: { orgId: string; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const invite = useMutation({
    mutationFn: () => api.post(`/organizations/${orgId}/invitations`, { email, role }),
    onSuccess: onDone,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-canvas p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-ink">Invite a teammate</h2><button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface"><X className="h-4 w-4" /></button></div>
        <label className="block text-sm"><span className="font-medium text-ink">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ring" /></label>
        <label className="mt-3 block text-sm"><span className="font-medium text-ink">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize text-ink outline-none">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
        {invite.isError && <p className="mt-2 text-sm text-[var(--color-danger)]">{invite.error instanceof ApiError ? invite.error.message : 'Failed'}</p>}
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" size="sm" onClick={onClose}>Cancel</Button><Button variant="brand" size="sm" disabled={!email || invite.isPending} onClick={() => invite.mutate()}>{invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send invite</Button></div>
      </div>
    </div>
  );
}
