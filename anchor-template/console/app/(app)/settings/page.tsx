'use client';

import { Info } from 'lucide-react';
import { useAnchor } from '@/components/anchor-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Branding is set once at provisioning time (the provisioner's branding map → container
// env). There is no runtime branding-edit endpoint yet, so this screen shows the current
// values read-only and is explicit that editing isn't wired — rather than presenting an
// editable form that silently does nothing.
export default function SettingsPage() {
  const { name, slug, assetCode, logoUrl, status, role } = useAnchor();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-subtle">Your anchor&apos;s identity and configuration.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-subtle">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Branding is currently applied at launch. Editing it live (name, logo, colours) needs a backend endpoint that doesn&apos;t exist yet — these fields are read-only for now.</span>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Business identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Business name" value={name} />
          <Field label="Anchor slug" value={<span className="font-mono text-sm">{slug}</span>} />
          <Field label="Asset" value={assetCode} />
          <Field label="Logo" value={logoUrl ? <img src={logoUrl} alt="logo" className="h-8 w-8 rounded" /> : <span className="text-subtle">Default monogram</span>} />
        </CardContent>
      </Card>

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
