'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2, Copy, Check, KeyRound, Loader2, X } from 'lucide-react';
import { bizGet, bizPost, bizDelete, ApiError } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { dateTime } from '@/lib/format';

interface Key { id: string; name: string; masked: string; scopes: string[]; live: boolean; created: number; lastUsed: number | null }

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['keys'], queryFn: () => bizGet<{ keys: Key[] }>('/admin/developer/keys') });
  const [reveal, setReveal] = useState<{ secret: string; label: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => bizDelete(`/admin/developer/keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keys'] }),
  });
  const roll = useMutation({
    mutationFn: (id: string) => bizPost<{ secret: string }>(`/admin/developer/keys/${id}/roll`),
    onSuccess: (r) => { setReveal({ secret: r.secret, label: 'Rotated key' }); qc.invalidateQueries({ queryKey: ['keys'] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">API keys</h1>
          <p className="text-sm text-subtle">Keys for programmatic access. The full secret is shown only once, at creation.</p>
        </div>
        <Button variant="brand" size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New key</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[0,1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !data?.keys.length ? (
            <p className="p-8 text-center text-sm text-subtle">No API keys yet. Create one to integrate with the anchor programmatically.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead><TR className="border-line"><TH className="pl-4">Name</TH><TH>Key</TH><TH>Env</TH><TH>Last used</TH><TH></TH></TR></THead>
                <TBody>
                  {data.keys.map((k) => (
                    <TR key={k.id}>
                      <TD className="pl-4"><span className="inline-flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-subtle" />{k.name}</span></TD>
                      <TD className="font-mono text-xs text-subtle">{k.masked}</TD>
                      <TD><Badge tone={k.live ? 'success' : 'neutral'}>{k.live ? 'Live' : 'Test'}</Badge></TD>
                      <TD className="text-subtle">{k.lastUsed ? dateTime(new Date(k.lastUsed).toISOString()) : '—'}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={roll.isPending} onClick={() => { if (confirm('Rotate this key? The old secret stops working immediately.')) roll.mutate(k.id); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this key permanently?')) del.mutate(k.id); }}><Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" /></Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(secret) => { setCreating(false); setReveal({ secret, label: 'New key' }); qc.invalidateQueries({ queryKey: ['keys'] }); }} />}
      {reveal && <RevealDialog secret={reveal.secret} label={reveal.label} onClose={() => setReveal(null)} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (secret: string) => void }) {
  const [name, setName] = useState('');
  const [live, setLive] = useState(false);
  const create = useMutation({
    mutationFn: () => bizPost<{ secret: string }>('/admin/developer/keys', { name, live }),
    onSuccess: (r) => onCreated(r.secret),
  });
  return (
    <Modal onClose={onClose} title="Create API key">
      <label className="block text-sm">
        <span className="font-medium text-ink">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backend integration" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
        <span className="text-ink">Live key <span className="text-subtle">(moves real value — leave off for testing)</span></span>
      </label>
      {create.isError && <p className="mt-2 text-sm text-[var(--color-danger)]">{create.error instanceof ApiError ? create.error.message : 'Failed'}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="brand" size="sm" disabled={!name || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create</Button>
      </div>
    </Modal>
  );
}

function RevealDialog({ secret, label, onClose }: { secret: string; label: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal onClose={onClose} title={`${label} — copy it now`}>
      <p className="text-sm text-subtle">This secret is shown only once. Store it securely; you cannot retrieve it again.</p>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface p-3">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{secret}</code>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); }}>
          {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-4 flex justify-end"><Button variant="brand" size="sm" onClick={onClose}>Done</Button></div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-canvas p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-ink">{title}</h2><button onClick={onClose} className="rounded-md p-1 text-subtle hover:bg-surface"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>
  );
}
