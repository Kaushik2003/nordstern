'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Loader2, ImageIcon, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { useAnchor } from '@/components/anchor-context';
import { bizGet, bizPost } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { name, slug, assetCode, logoUrl: envLogo, status, role } = useAnchor();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  // Live logo override (persisted server-side). Falls back to the provisioned env logo.
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => bizGet<{ logoUrl: string | null }>('/admin/settings') });
  const currentLogo = data?.logoUrl ?? envLogo ?? null;

  const persist = (logoUrl: string) =>
    bizPost('/admin/settings/logo', { logoUrl }).then(() => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    });

  // Upload the chosen file to Vercel Blob (via our route), then persist the returned URL.
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/logo-upload', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? 'Upload failed');
      await persist(body.url as string);
    },
    onMutate: () => { setErr(''); setSaved(false); },
    onSuccess: () => setSaved(true),
    onError: (e) => setErr(e instanceof Error ? e.message : 'Upload failed'),
  });

  const clear = useMutation({
    mutationFn: () => persist(''),
    onMutate: () => { setErr(''); setSaved(false); },
    onSuccess: () => setSaved(true),
  });

  const busy = upload.isPending || clear.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-subtle">Your anchor&apos;s identity and configuration.</p>
      </div>

      {/* Logo — upload to Vercel Blob; used as the app logo and the browser favicon. */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-surface">
              {currentLogo
                ? <img src={currentLogo} alt="logo" className="h-full w-full object-contain" />
                : <ImageIcon className="h-7 w-7 text-subtle" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }}
                />
                <Button size="sm" variant="brand" disabled={busy} onClick={() => fileInput.current?.click()}>
                  {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload logo
                </Button>
                {currentLogo && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => clear.mutate()}>
                    {clear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
                  </Button>
                )}
              </div>
              {err && <p className="text-xs text-[var(--color-danger)]">{err}</p>}
              {saved && !busy && <p className="flex items-center gap-1 text-xs text-[var(--color-success)]"><CheckCircle2 className="h-3.5 w-3.5" /> Saved. Refresh to update the favicon.</p>}
            </div>
          </div>

          {/* Guidelines */}
          <ul className="space-y-1 rounded-lg border border-line bg-surface/60 p-3 text-xs text-subtle">
            <li>• <span className="font-medium text-ink">Square (1:1)</span> — it&apos;s shown in circular and rounded frames.</li>
            <li>• <span className="font-medium text-ink">SVG or transparent PNG</span> preferred (JPG / WebP also accepted).</li>
            <li>• At least <span className="font-medium text-ink">256×256px</span>, under 2 MB. It becomes your app logo and browser favicon.</li>
          </ul>
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
