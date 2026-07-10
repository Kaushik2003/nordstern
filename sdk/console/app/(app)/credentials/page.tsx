'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, RotateCw, Trash2, Plus, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAnchor } from '@/components/anchor-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Operator credential management. Values are write-only: we render the MASKED shape
// (which keys are set, when) from the R2a API and never fetch/display a secret. Adding
// or rotating writes straight to the SecretStore; the DB only stores a reference.
interface MaskedCredential {
  provider: string;
  configured: boolean;
  keyNames: string[];
  secretProvider: string | null;
  lastRotatedAt: string | null;
  updatedAt: string | null;
}

// Provider field specs (match the SecretStore's known keys). `optional` fields may be
// left blank. Everything is a secret input — never prefilled, never echoed back.
const PROVIDERS: Record<string, { label: string; blurb: string; fields: { key: string; label: string; optional?: boolean }[] }> = {
  razorpay: {
    label: 'Razorpay',
    blurb: 'Collect INR deposits (fiat-in).',
    fields: [
      { key: 'RAZORPAY_KEY_ID', label: 'Key ID' },
      { key: 'RAZORPAY_KEY_SECRET', label: 'Key Secret' },
      { key: 'RAZORPAY_WEBHOOK_SECRET', label: 'Webhook Secret', optional: true },
    ],
  },
  cashfree: {
    label: 'Cashfree',
    blurb: 'Disburse INR payouts (fiat-out).',
    fields: [
      { key: 'CASHFREE_APP_ID', label: 'App ID' },
      { key: 'CASHFREE_SECRET_KEY', label: 'Secret Key' },
      { key: 'CASHFREE_WEBHOOK_SECRET', label: 'Webhook Secret', optional: true },
    ],
  },
  treasury: {
    label: 'Treasury',
    blurb: 'Signing seed for the on-chain treasury account.',
    fields: [{ key: 'TREASURY_SECRET', label: 'Secret Seed' }],
  },
};

export default function CredentialsPage() {
  const { orgId, anchorId, loading } = useAnchor();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const base = `/organizations/${orgId}/anchors/${anchorId}/credentials`;

  const { data, isLoading } = useQuery({
    queryKey: ['credentials', anchorId],
    queryFn: () => api.get<MaskedCredential[]>(base),
    enabled: !!orgId && !!anchorId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['credentials', anchorId] });

  if (loading || !orgId || !anchorId) {
    return <div className="flex items-center gap-2 text-sm text-subtle"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const byProvider = new Map((data ?? []).map((c) => [c.provider, c]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Credentials</h1>
        <p className="text-sm text-subtle">
          Payment-provider keys for this anchor. Stored in our secret store — never in a database,
          never shown again after you save them.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-xs text-subtle">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span>
          We display only which keys are set and when — values are write-only. Rotating replaces a
          provider&apos;s keys; removing deletes them from the store.
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-subtle"><Loader2 className="h-4 w-4 animate-spin" /> Loading credentials…</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(PROVIDERS).map(([provider, spec]) => {
            const cred = byProvider.get(provider);
            const configured = cred?.configured ?? false;
            return (
              <Card key={provider}>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <KeyRound className="h-4 w-4 text-subtle" /> {spec.label}
                      {configured ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Configured</span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-subtle">Not set</span>
                      )}
                    </CardTitle>
                    <CardDescription>{spec.blurb}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {configured && (
                      <DeleteButton base={base} provider={provider} onDone={invalidate} />
                    )}
                    <Button variant={configured ? 'outline' : 'brand'} size="sm" onClick={() => setEditing(editing === provider ? null : provider)}>
                      {configured ? <><RotateCw className="h-3.5 w-3.5" /> Rotate</> : <><Plus className="h-3.5 w-3.5" /> Set up</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {configured && cred && (
                    <div className="flex flex-wrap items-center gap-2">
                      {cred.keyNames.map((k) => (
                        <span key={k} className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-subtle">
                          {k} <span className="text-ink">••••</span>
                        </span>
                      ))}
                      {cred.lastRotatedAt && (
                        <span className="text-[11px] text-subtle">updated {new Date(cred.lastRotatedAt).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                  {editing === provider && (
                    <CredentialForm
                      base={base}
                      provider={provider}
                      spec={spec}
                      rotate={configured}
                      onDone={() => { setEditing(null); invalidate(); }}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ base, provider, onDone }: { base: string; provider: string; onDone: () => void }) {
  const m = useMutation({ mutationFn: () => api.del(`${base}/${provider}`), onSuccess: onDone });
  return (
    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" disabled={m.isPending}
      onClick={() => { if (confirm(`Remove ${provider} credentials? This deletes them from the secret store.`)) m.mutate(); }}>
      <Trash2 className="h-3.5 w-3.5" /> Remove
    </Button>
  );
}

function CredentialForm({
  base, provider, spec, rotate, onDone, onCancel,
}: {
  base: string;
  provider: string;
  spec: { fields: { key: string; label: string; optional?: boolean }[] };
  rotate: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const m = useMutation({
    mutationFn: (credentials: Record<string, string>) =>
      rotate
        ? api.post(`${base}/${provider}/rotate`, { credentials })
        : api.put(`${base}/${provider}`, { credentials }),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Failed to save'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const credentials: Record<string, string> = {};
    for (const f of spec.fields) {
      const v = (values[f.key] ?? '').trim();
      if (v) credentials[f.key] = v;
      else if (!f.optional) { setError(`${f.label} is required`); return; }
    }
    m.mutate(credentials);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-surface p-4">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {spec.fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs">{f.label}{f.optional && <span className="text-subtle"> (optional)</span>}</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder="••••••••"
            className="bg-canvas font-mono"
            value={values[f.key] ?? ''}
            onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="brand" size="sm" disabled={m.isPending}>
          {m.isPending ? 'Saving…' : rotate ? 'Rotate keys' : 'Save keys'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
