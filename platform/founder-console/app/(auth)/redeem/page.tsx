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
  // Optional PSP credentials — go straight to the secret store, never shown again.
  razorpayKeyId: z.string().optional(),
  razorpayKeySecret: z.string().optional(),
  cashfreeAppId: z.string().optional(),
  cashfreeSecretKey: z.string().optional(),
});

type Form = z.infer<typeof schema>;

function RedeemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [stage, setStage] = useState<string | null>(null);   // real control-plane progress
  const [provisioning, setProvisioning] = useState(false);
  const [gated, setGated] = useState(false);
  const [success, setSuccess] = useState(false);

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
      if (s.status === 'completed') { setSuccess(true); return; }
      if (s.status === 'failed') { setError(s.error || 'Provisioning failed'); setProvisioning(false); return; }
      setTimeout(() => pollStatus(jobId), 3000);
    } catch {
      setTimeout(() => pollStatus(jobId), 3000);
    }
  }

  async function onSubmit(v: Form) {
    setError('');
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
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><CheckCircle2 className="h-16 w-16 text-brand" /></div>
          <CardTitle>Anchor Provisioned Successfully!</CardTitle>
          <CardDescription>Your isolated stack is live and routing is up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">Sign in to your operator console to manage treasury, pricing, and credentials.</p>
          <Button onClick={() => router.push('/login')} className="w-full">Proceed to Login</Button>
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
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Provisioning your Anchor</CardTitle>
          <CardDescription>Launching your dedicated infrastructure on Stellar testnet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
            <Loader2 className="h-5 w-5 text-brand animate-spin shrink-0" />
            <span className="font-medium text-foreground">{stage}</span>
          </div>
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
                  <span className="font-medium text-foreground">Payment credentials (optional).</span> Stored in our
                  secret store — never in a database, never shown again. Leave blank to launch on mock rails and add
                  them later from your console.
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
