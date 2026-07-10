'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { api, ApiError } from '@nordstern/shared-auth';
import { Button } from '@nordstern/shared-ui';
import { Input } from '@nordstern/shared-ui';
import { Label } from '@nordstern/shared-ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@nordstern/shared-ui';
import { CheckCircle2, Loader2, ShieldCheck, Clock, Palette } from 'lucide-react';

const schema = z.object({
  token: z.string().min(1, 'Token is required'),
  subdomain: z.string()
    .min(3, 'Minimum 3 characters')
    .max(63, 'Maximum 63 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Only lowercase letters, numbers, and hyphens'),
  fullName: z.string().min(2, 'Name is required'),
  // Brand identity — powers the customer app + operator console. All optional; sensible
  // defaults (NordStern purple + monogram) apply when omitted.
  displayName: z.string().optional(),
  accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Use a hex color like #2563EB').optional().or(z.literal('')),
  logoUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
  supportEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  websiteUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
  // Razorpay is REQUIRED — anchors launch on a real on-ramp, never mock (no-mock-rails rule).
  // Keys go straight to the secret store, never shown again.
  razorpayKeyId: z.string().min(1, 'Required — anchors launch on a real on-ramp'),
  razorpayKeySecret: z.string().min(1, 'Required — anchors launch on a real on-ramp'),
  cashfreeAppId: z.string().optional(),
  cashfreeSecretKey: z.string().optional(),
});

type Form = z.infer<typeof schema>;

// The real provisioning stages the control-plane emits, as a visible timeline. Each user-facing
// step lights up (pending → running → done) as the polled `stage` string advances.
const STEPS = [
  { label: 'Funding accounts & issuing your asset on Stellar' },
  { label: 'Creating your isolated database & containers' },
  { label: 'Bringing your anchor online & wiring routing' },
] as const;

// Map a control-plane stage string to the index of the step currently in progress.
function stageToStep(stage: string | null | undefined): number {
  const s = stage ?? '';
  if (/database|container|creat/i.test(s)) return 1;
  if (/health|live|active|complete|running|route|routing/i.test(s)) return 2;
  return 0; // queued / provisioning started / funding / issuing
}

type Evidence = { assetCode?: string; issuer?: string; webAuth?: string; network?: 'testnet' | 'public' };

// A labelled row in the post-launch evidence panel.
function EvidenceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

// Read the live anchor's SEP-1 TOML — the authoritative proof the anchor is real: it advertises
// the issued asset + issuer + web-auth endpoint that wallets discover. Best-effort; if it can't be
// fetched (CORS/not-ready), we still show the links so the founder can verify manually.
async function loadEvidence(domain: string): Promise<Evidence | null> {
  try {
    const r = await fetch(`https://${domain}/.well-known/stellar.toml`, { cache: 'no-store' });
    if (!r.ok) return null;
    const t = await r.text();
    const pass = /NETWORK_PASSPHRASE\s*=\s*"([^"]+)"/.exec(t)?.[1];
    return {
      assetCode: /code\s*=\s*"([^"]+)"/.exec(t)?.[1],
      issuer: /issuer\s*=\s*"([^"]+)"/.exec(t)?.[1],
      webAuth: /WEB_AUTH_ENDPOINT\s*=\s*"([^"]+)"/.exec(t)?.[1],
      network: pass?.includes('Test') ? 'testnet' : 'public',
    };
  } catch {
    return null;
  }
}

function RedeemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [stage, setStage] = useState<string | null>(null);   // real control-plane progress
  const [provisioning, setProvisioning] = useState(false);
  const [gated, setGated] = useState(false);
  const [success, setSuccess] = useState(false);
  // Live provisioning detail for the step timeline + the launched anchor's coordinates/evidence.
  const [slug, setSlug] = useState('');
  const [homeDomain, setHomeDomain] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get('token') || '', subdomain: '', fullName: '' },
  });
  const accentValue = watch('accent');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setValue('token', token);
  }, [searchParams, setValue]);

  // Poll the REAL provisioning status endpoint until terminal.
  async function pollStatus(jobId: string) {
    try {
      const s = await api.get(`/anchor-invitations/status/${jobId}`) as any;
      setStage(s.stage ?? 'Working…');
      if (s.homeDomain) setHomeDomain(s.homeDomain);
      if (s.status === 'completed') {
        const domain = s.homeDomain ?? (slug ? `${slug}.nordstern.live` : null);
        if (domain) setEvidence(await loadEvidence(domain));
        setSuccess(true);
        return;
      }
      if (s.status === 'failed') { setError(s.error || 'Provisioning failed'); setProvisioning(false); return; }
      setTimeout(() => pollStatus(jobId), 3000);
    } catch {
      setTimeout(() => pollStatus(jobId), 3000);
    }
  }

  async function onSubmit(v: Form) {
    setError('');
    setSlug(v.subdomain);
    const credentials: Record<string, Record<string, string>> = {};
    if (v.razorpayKeyId && v.razorpayKeySecret) {
      credentials.razorpay = { RAZORPAY_KEY_ID: v.razorpayKeyId, RAZORPAY_KEY_SECRET: v.razorpayKeySecret };
    }
    if (v.cashfreeAppId && v.cashfreeSecretKey) {
      credentials.cashfree = { CASHFREE_APP_ID: v.cashfreeAppId, CASHFREE_SECRET_KEY: v.cashfreeSecretKey };
    }
    const branding: Record<string, string> = {};
    if (v.displayName) branding.displayName = v.displayName;
    if (v.accent) branding.accent = v.accent;
    if (v.logoUrl) branding.logoUrl = v.logoUrl;
    if (v.supportEmail) branding.supportEmail = v.supportEmail;
    if (v.websiteUrl) branding.websiteUrl = v.websiteUrl;
    try {
      const res = await api.post('/anchor-invitations/redeem', {
        token: v.token, subdomain: v.subdomain, fullName: v.fullName,
        ...(Object.keys(credentials).length ? { credentials } : {}),
        ...(Object.keys(branding).length ? { branding } : {}),
      }) as any;

      if (res.provisioning === 'gated') { setGated(true); return; }
      setProvisioning(true);
      setStage('Queued');
      pollStatus(res.jobId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    }
  }

  if (success) {
    const domain = homeDomain ?? (slug ? `${slug}.nordstern.live` : null);
    const consoleUrl = slug ? `https://console-${slug}.nordstern.live` : null;
    const net = evidence?.network ?? 'testnet';
    const expert = (acct: string) => `https://stellar.expert/explorer/${net}/account/${acct}`;
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><CheckCircle2 className="h-16 w-16 text-brand" /></div>
          <CardTitle>Anchor Provisioned Successfully!</CardTitle>
          <CardDescription>Your isolated stack is live and routing is up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Evidence — real, verifiable coordinates of the launched anchor. */}
          <div className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm">
            {domain && (
              <EvidenceRow label="Anchor (customer app)">
                <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">{domain}</a>
              </EvidenceRow>
            )}
            {domain && (
              <EvidenceRow label="SEP-1 service file">
                <a href={`https://${domain}/.well-known/stellar.toml`} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">/.well-known/stellar.toml</a>
              </EvidenceRow>
            )}
            {evidence?.assetCode && (
              <EvidenceRow label="Issued asset">
                <span className="font-medium text-foreground">{evidence.assetCode}</span>
                <span className="text-muted-foreground"> · {net}</span>
              </EvidenceRow>
            )}
            {evidence?.issuer && (
              <EvidenceRow label="Asset issuer">
                <a href={expert(evidence.issuer)} target="_blank" rel="noreferrer" className="font-mono text-xs text-brand hover:underline break-all">
                  {evidence.issuer.slice(0, 8)}…{evidence.issuer.slice(-6)} ↗
                </a>
              </EvidenceRow>
            )}
            {evidence?.webAuth && (
              <EvidenceRow label="SEP-10 auth">
                <span className="font-mono text-xs text-muted-foreground break-all">{evidence.webAuth}</span>
              </EvidenceRow>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Your operator console is ready — manage treasury, pricing, KYC, and credentials there.
          </p>
          {consoleUrl ? (
            <div className="space-y-2">
              <a href={consoleUrl} target="_blank" rel="noreferrer" className="block">
                <Button className="w-full">Open your operator console ↗</Button>
              </a>
              <p className="text-center text-xs text-muted-foreground break-all">{consoleUrl.replace('https://', '')}</p>
            </div>
          ) : (
            <Button onClick={() => router.push('/login')} className="w-full">Proceed to Login</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (gated) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><Clock className="h-16 w-16 text-brand" /></div>
          <CardTitle>Application Received — Production Review</CardTitle>
          <CardDescription>Your account and credentials are saved securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            Production anchors move real money and are provisioned only after a go-live review of your
            regulatory standing. We&apos;ll be in touch. You can sign in now to complete setup.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">Proceed to Login</Button>
        </CardContent>
      </Card>
    );
  }

  if (provisioning) {
    const current = stageToStep(stage);
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Provisioning your Anchor</CardTitle>
          <CardDescription>Launching your dedicated infrastructure on Stellar testnet.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const state = i < current ? 'done' : i === current ? 'running' : 'pending';
              return (
                <li key={i} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${state === 'running' ? 'border-brand/40 bg-brand/5' : 'border-line bg-surface'}`}>
                  <span className="mt-0.5 shrink-0">
                    {state === 'done' && <CheckCircle2 className="h-5 w-5 text-brand" />}
                    {state === 'running' && <Loader2 className="h-5 w-5 text-brand animate-spin" />}
                    {state === 'pending' && <span className="block h-5 w-5 rounded-full border-2 border-line" />}
                  </span>
                  <div className="flex-1">
                    <span className={state === 'pending' ? 'text-muted-foreground' : 'font-medium text-foreground'}>{s.label}</span>
                    {state === 'running' && <p className="mt-0.5 text-xs text-muted-foreground">{stage}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {homeDomain && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Your anchor will be live at <span className="font-mono text-foreground break-all">{homeDomain}</span>
            </p>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Redeem Invitation</CardTitle>
        <CardDescription>Set up your operator account and (optionally) connect your payment rails.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Invitation Token</Label>
            <Input id="token" type="text" {...register('token')} />
            {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" placeholder="e.g. Priya Sharma" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Desired Subdomain</Label>
            <div className="flex items-center border rounded-md px-3 bg-background">
              <input
                id="subdomain"
                placeholder="mizupay"
                {...register('subdomain')}
                className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <span className="text-sm text-muted-foreground">.nordstern.live</span>
            </div>
            {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain.message}</p>}
          </div>

          {/* Brand identity — applied to the customer app + operator console. Optional. */}
          <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start gap-2">
              <Palette className="h-4 w-4 text-brand mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Brand your anchor (optional).</span> Make it feel like
                your product. Leave blank to use a generated monogram and the default accent.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Display name</Label>
                <Input placeholder="e.g. MizuPay" {...register('displayName')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Brand color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentValue || '#ab9ff2'} onChange={(e) => setValue('accent', e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-canvas" />
                  <Input placeholder="#2563EB" {...register('accent')} className="font-mono" />
                </div>
                {errors.accent && <p className="text-xs text-destructive">{errors.accent.message}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Logo URL</Label>
                <Input placeholder="https://…/logo.png" {...register('logoUrl')} />
                {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Support email</Label>
                <Input placeholder="support@mizupay.io" {...register('supportEmail')} />
                {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input placeholder="https://mizupay.io" {...register('websiteUrl')} />
                {errors.websiteUrl && <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>}
              </div>
            </div>
          </div>

          {/* Optional PSP credentials — encrypted in the secret store, never displayed again */}
          <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Payment credentials.</span> Stored in our
                  secret store — never in a database, never shown again. <span className="font-medium text-foreground">Razorpay
                  is required</span> — anchors launch on a real on-ramp (use test-mode keys for a sandbox anchor).
                  Cashfree (payouts) is optional.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Razorpay Key ID</Label>
                  <Input placeholder="rzp_test_…" {...register('razorpayKeyId')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Razorpay Key Secret</Label>
                  <Input type="password" placeholder="••••••••" {...register('razorpayKeySecret')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cashfree App ID</Label>
                  <Input placeholder="CF…" {...register('cashfreeAppId')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cashfree Secret Key</Label>
                  <Input type="password" placeholder="••••••••" {...register('cashfreeSecretKey')} />
                </div>
              </div>
            </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying Invite…' : 'Accept Invitation & Launch'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// useSearchParams() forces a client-side bailout, so the consumer must sit under a
// Suspense boundary — this lets the page shell prerender while the token-reading form
// hydrates on the client. (Next.js-recommended pattern; no dynamic/static opt-out.)
export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-lg mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 text-brand animate-spin" /> Loading…
            </div>
          </CardContent>
        </Card>
      }
    >
      <RedeemForm />
    </Suspense>
  );
}
