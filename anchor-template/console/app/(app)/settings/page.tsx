'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Check, Loader2, ImageIcon } from 'lucide-react';
import { useAnchor } from '@/components/anchor-context';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { name, slug, assetCode, logoUrl: envLogo, status, role } = useAnchor();
  const qc = useQueryClient();

  // Live logo override (persisted server-side). Falls back to the provisioned env logo.
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => bizGet<{ logoUrl: string | null }>('/admin/settings') });
  const currentLogo = data?.logoUrl ?? envLogo ?? null;

  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(data?.logoUrl ?? ''); }, [data?.logoUrl]);

  const save = useMutation({
    mutationFn: (logoUrl: string) => bizPost('/admin/settings/logo', { logoUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['summary'] }); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-subtle">Your anchor&apos;s identity and configuration.</p>
      </div>

      {/* Logo — editable; used as the app logo and the browser favicon. */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-subtle">Paste an image URL. It becomes your logo across the console and your customers&apos; app, and the browser favicon. Leave blank to use the default.</p>
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface">
              {currentLogo
                ? <img src={currentLogo} alt="logo" className="h-full w-full object-contain" />
                : <ImageIcon className="h-6 w-6 text-subtle" />}
            </div>
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm text-ink outline-none focus:border-brand"
                />
                <Button size="sm" variant="brand" disabled={save.isPending || url.trim() === (data?.logoUrl ?? '')} onClick={() => save.mutate(url.trim())}>
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
                </Button>
                {url && <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => { setUrl(''); save.mutate(''); }}>Clear</Button>}
              </div>
              {save.isError && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{save.error instanceof ApiError ? save.error.message : 'Could not save logo'}</p>}
              {save.isSuccess && !save.isPending && <p className="mt-1.5 text-xs text-[var(--color-success)]">Saved. Refresh to update the favicon.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Business identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Business name" value={name} />
          <Field label="Anchor slug" value={<span className="font-mono text-sm">{slug}</span>} />
          <Field label="Asset" value={assetCode} />
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-subtle">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Business name and colours are applied at launch (colours are fixed to the NordStern palette). Only the logo is editable live for now.</span>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Access</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Anchor status" value={status ? <Badge tone={status === 'active' ? 'success' : 'warning'}>{status}</Badge> : '—'} />
          <Field label="Your role" value={role ? <Badge tone="info">{role}</Badge> : '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-subtle">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
