'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { api, ApiError } from '@nordstern/shared-auth';
import { CheckCircle2, Loader2, Clock, ArrowRight, ArrowLeft, CornerDownLeft, ShieldCheck, Palette, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { FIAT, COMING_SOON_LABEL } from '../../../lib/onboarding/availability';

const schema = z.object({
  token: z.string().min(1, 'Enter your invitation token'),
  subdomain: z.string()
    .min(3, 'Minimum 3 characters')
    .max(63, 'Maximum 63 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Only lowercase letters, numbers, and hyphens'),
  fullName: z.string().min(2, 'Tell us your name'),
  // Asset the anchor distributes. external = Circle USDC (live-priced, mainnet-capable);
  // self-issued = a minted custom token (TESTNET ONLY) with a fixed price.
  assetModel: z.enum(['external', 'self-issued']),
  assetCode: z.string().optional(),
  assetName: z.string().optional(),
  assetPriceInr: z.string().optional(),
  settlementCurrency: z.string(),
  // Per-transaction limits in the asset (e.g. USDC). Optional; sandbox defaults apply if blank.
  minTxn: z.string().optional(),
  maxTxn: z.string().optional(),
  displayName: z.string().optional(),
  logoUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
  supportEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  websiteUrl: z.string().url('Must be a URL').optional().or(z.literal('')),
  razorpayKeyId: z.string().min(1, 'Required — anchors launch on a real on-ramp'),
  razorpayKeySecret: z.string().min(1, 'Required — anchors launch on a real on-ramp'),
  cashfreeAppId: z.string().optional(),
  cashfreeSecretKey: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.assetModel === 'self-issued') {
    if (!/^[A-Za-z0-9]{1,12}$/.test(v.assetCode ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['assetCode'], message: '1–12 letters or digits' });
    }
    const p = Number(v.assetPriceInr);
    if (!Number.isFinite(p) || p <= 0) {
      ctx.addIssue({ code: 'custom', path: ['assetPriceInr'], message: 'Enter a price in INR greater than 0' });
    }
  }
  // Transaction limits: each (if given) must be > 0, and min ≤ max.
  const lo = v.minTxn ? Number(v.minTxn) : undefined;
  const hi = v.maxTxn ? Number(v.maxTxn) : undefined;
  if (v.minTxn && (!Number.isFinite(lo!) || lo! <= 0)) ctx.addIssue({ code: 'custom', path: ['minTxn'], message: 'Enter an amount greater than 0' });
  if (v.maxTxn && (!Number.isFinite(hi!) || hi! <= 0)) ctx.addIssue({ code: 'custom', path: ['maxTxn'], message: 'Enter an amount greater than 0' });
  if (lo != null && hi != null && lo > hi) ctx.addIssue({ code: 'custom', path: ['maxTxn'], message: 'Max must be at least the minimum' });
});

type Form = z.infer<typeof schema>;

// ── Provisioning timeline (real control-plane stages) ────────────────────────────
const STEPS = [
  'Preparing your asset & accounts on Stellar',
  'Creating your isolated database & containers',
  'Bringing your anchor online & wiring routing',
] as const;
function stageToStep(stage: string | null | undefined): number {
  const s = stage ?? '';
  if (/database|container|creat/i.test(s)) return 1;
  if (/health|live|active|complete|running|route|routing|aggregator/i.test(s)) return 2;
  return 0;
}

// Verify an invitation token up front (before the founder fills anything in): is it genuine,
// unused, unexpired — and which network will the anchor launch on? Returns the network so the
// UI can gate the custom-token option, or an actionable error to show instead of the form.
async function checkToken(token: string): Promise<{ ok: boolean; network?: 'testnet' | 'mainnet'; name?: string; businessName?: string; error?: string }> {
  try {
    const r = await api.get(`/anchor-invitations/verify?token=${encodeURIComponent(token)}`) as any;
    return {
      ok: true,
      network: r?.network === 'mainnet' ? 'mainnet' : 'testnet',
      name: typeof r?.name === 'string' ? r.name : '',
      businessName: typeof r?.businessName === 'string' ? r.businessName : '',
    };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'This invitation is invalid or has expired.' };
  }
}

type Evidence = { assetCode?: string; issuer?: string; webAuth?: string; network?: 'testnet' | 'public' };

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

// ── Small building blocks in the landing aesthetic ──────────────────────────────
function Brand({ network }: { network: 'testnet' | 'mainnet' }) {
  return (
    <div className="flex items-center justify-between px-6 py-6 sm:px-10">
      {/* Match the landing lockup: mark (logo-dark.png) + wordmark. */}
      <span className="inline-flex items-center gap-2">
        <Image src="/logo-dark.png" alt="NordStern" width={40} height={40} priority className="h-9 w-9 rounded-[10px] object-contain" />
        <span className="text-lg font-semibold tracking-tight text-ink">NordStern</span>
      </span>
      <span className="rounded-pill border border-line px-3 py-1 text-xs font-medium capitalize text-subtle">
        {network}
      </span>
    </div>
  );
}

// A typeform "question" frame: index arrow, big title, optional helper, then fields.
function Q({ index, title, helper, children }: { index: number; title: string; helper?: string; children?: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2 text-brand">
        <span className="text-base font-semibold tabular-nums">{index}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">{title}</h1>
      {helper && <p className="mt-3 text-base leading-relaxed text-subtle">{helper}</p>}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

// Official USDC mark (Circle blue + white $) — inline SVG, self-contained.
function UsdcMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path fill="#fff" d="M20.4 18.55c0-2.37-1.42-3.18-4.27-3.52-2.03-.27-2.44-.81-2.44-1.76 0-.95.68-1.56 2.03-1.56 1.22 0 1.9.41 2.23 1.42a.5.5 0 0 0 .48.34h1.08c.27 0 .47-.2.47-.47v-.07a3.36 3.36 0 0 0-3.05-2.7v-1.62c0-.27-.2-.47-.54-.54h-1.02c-.27 0-.47.2-.54.54v1.56c-2.03.27-3.32 1.62-3.32 3.32 0 2.24 1.36 3.12 4.2 3.46 1.9.34 2.5.75 2.5 1.83 0 1.08-.94 1.83-2.23 1.83-1.76 0-2.37-.75-2.57-1.76a.5.5 0 0 0-.48-.4h-1.15c-.27 0-.47.2-.47.47v.07c.27 1.69 1.36 2.9 3.59 3.25v1.63c0 .27.2.47.54.54h1.02c.27 0 .47-.2.54-.54v-1.63c2.03-.34 3.39-1.76 3.39-3.52z"/>
      <path fill="#fff" d="M12.62 25.5c-5.28-1.9-8-7.79-6.03-13a10.16 10.16 0 0 1 6.03-6.03c.27-.14.4-.34.4-.68v-.94c0-.27-.13-.47-.4-.54-.07 0-.2 0-.34.07A12.05 12.05 0 0 0 4.5 16c0 5.15 3.32 9.68 8.12 11.4.27.13.54 0 .6-.27.07-.07.07-.14.07-.27v-.95c0-.2-.2-.4-.67-.4zm6.83-21.4c-.27-.13-.54 0-.6.27-.07.07-.07.14-.07.27v.95c0 .27.2.47.4.6 5.28 1.9 8 7.79 6.03 13a10.16 10.16 0 0 1-6.03 6.03c-.27.14-.4.34-.4.68v.94c0 .27.13.47.4.54.07 0 .2 0 .34-.07A12.05 12.05 0 0 0 27.5 16c0-5.15-3.39-9.68-8.05-11.4z"/>
    </svg>
  );
}

// Big underline-style input — the typeform signature.
function BigInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border-b-2 border-line bg-transparent pb-2 text-2xl font-medium text-ink outline-none transition-colors placeholder:text-subtle/40 focus:border-brand"
    />
  );
}

const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-subtle';
const SMALL_INPUT = 'w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-subtle/50 focus:border-brand';

// Logo upload → Vercel Blob (POST /blob-upload). Owns its own upload state; on success it
// calls onChange with the public Blob URL, which the form stores as `logoUrl`.
function LogoUpload({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/blob-upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error || 'Upload failed');
      onChange(j.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={FIELD_LABEL}>Logo</label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Logo preview" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-subtle/50" />
          )}
        </div>
        <div className="flex-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-canvas px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading…' : value ? 'Replace logo' : 'Upload logo'}
            <input
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.currentTarget.value = ''; }}
            />
          </label>
          {value && !uploading && (
            <button type="button" onClick={() => onChange('')} className="ml-3 text-sm text-subtle underline-offset-2 hover:text-ink hover:underline">
              Remove
            </button>
          )}
          <p className="mt-1.5 text-xs text-subtle">Square (1:1), SVG or transparent PNG, under 2 MB.</p>
        </div>
      </div>
      {err && <p className="mt-1.5 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function RedeemTypeform() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();

  const [error, setError] = useState('');
  const [stage, setStage] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [gated, setGated] = useState(false);
  const [success, setSuccess] = useState(false);
  const [slug, setSlug] = useState('');
  const [homeDomain, setHomeDomain] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('mainnet');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [verifyingToken, setVerifyingToken] = useState(false);

  const tokenFromUrl = !!searchParams.get('token');
  // Dev-only preview (?network=…) bypasses token verification so the UI can be designed
  // locally without a real invitation. Never active in production.
  const devPreview = process.env.NODE_ENV !== 'production'
    && (searchParams.get('network') === 'testnet' || searchParams.get('network') === 'mainnet');
  // Up-front token check. When the token arrives via URL we verify BEFORE showing the form;
  // 'checking' → spinner, 'invalid' → a dead-end screen, 'valid' → proceed. Manual token
  // entry (no URL token) is verified at the token step instead, so it starts 'valid'.
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>(
    tokenFromUrl && !devPreview ? 'checking' : 'valid',
  );
  const [tokenErr, setTokenErr] = useState('');

  const { register, handleSubmit, setValue, watch, trigger, getValues, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      token: searchParams.get('token') || '', subdomain: '', fullName: '',
      assetModel: 'external', settlementCurrency: 'INR',
    },
  });
  const assetModel = watch('assetModel');
  const settlementCurrency = watch('settlementCurrency');
  const subdomainValue = watch('subdomain');

  // Live, debounced subdomain availability. 'idle' before typing, 'checking' while the
  // request is in flight, then a concrete verdict so the founder gets instant feedback
  // instead of failing at launch. Only fires for a well-formed slug.
  const [subState, setSubState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid'>('idle');
  useEffect(() => {
    const s = (subdomainValue ?? '').toLowerCase();
    if (!s) { setSubState('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(s)) { setSubState('invalid'); return; }
    setSubState('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/anchor-invitations/subdomain-available?slug=${encodeURIComponent(s)}`) as any;
        if (cancelled) return;
        if (r.available === true) setSubState('available');
        else if (r.reason === 'reserved') setSubState('reserved');
        else if (r.reason === 'taken') setSubState('taken');
        else setSubState('invalid');
      } catch {
        if (!cancelled) setSubState('idle'); // network hiccup: don't block, launch re-validates
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [subdomainValue]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setValue('token', token);
    // Dev-only display override: ?network=testnet|mainnet lets us design both asset states
    // (and skip token verification) locally. It only affects what's SHOWN — the backend
    // re-validates the token AND the network at redeem, so this cannot be abused.
    if (devPreview) {
      setNetwork(searchParams.get('network') as 'testnet' | 'mainnet');
      return;
    }
    // Verify the invitation up front: genuine + which network. Invalid → dead-end screen
    // (rather than letting the founder fill everything in and fail only at Launch).
    if (token) {
      setTokenStatus('checking');
      checkToken(token).then((r) => {
        if (r.ok) {
          setTokenStatus('valid');
          if (r.network) setNetwork(r.network);
          // Pre-fill from the application (the founder already told us these at apply time).
          if (r.name && !getValues('fullName')) setValue('fullName', r.name);
          if (r.businessName && !getValues('displayName')) setValue('displayName', r.businessName);
        } else {
          setTokenStatus('invalid');
          setTokenErr(r.error || 'This invitation is invalid or has expired.');
        }
      });
    }
  }, [searchParams, setValue, getValues, devPreview]);

  useEffect(() => {
    if (network === 'mainnet' && assetModel === 'self-issued') setValue('assetModel', 'external');
  }, [network, assetModel, setValue]);

  // ── Step model ────────────────────────────────────────────────────────────────
  type StepId = 'welcome' | 'token' | 'name' | 'subdomain' | 'asset' | 'currency' | 'brand' | 'payment' | 'review';
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ['welcome'];
    if (!tokenFromUrl) s.push('token');
    s.push('name', 'subdomain', 'asset', 'currency', 'brand', 'payment', 'review');
    return s;
  }, [tokenFromUrl]);
  const id = steps[index];
  const pct = Math.round((index / (steps.length - 1)) * 100);

  const validators: Record<StepId, (keyof Form)[]> = {
    welcome: [], token: ['token'], name: ['fullName'], subdomain: ['subdomain'],
    asset: ['assetModel', 'assetCode', 'assetName', 'assetPriceInr'], currency: ['settlementCurrency', 'minTxn', 'maxTxn'],
    brand: ['logoUrl', 'supportEmail', 'websiteUrl'], payment: ['razorpayKeyId', 'razorpayKeySecret'], review: [],
  };

  async function advance() {
    const fields = validators[id];
    if (fields.length) {
      const ok = await trigger(fields as any);
      if (!ok) return;
    }
    // Don't let the founder move past a subdomain that's taken or reserved.
    if (id === 'subdomain' && (subState === 'taken' || subState === 'reserved')) {
      setError(subState === 'reserved' ? 'That subdomain is reserved — choose another.' : 'That subdomain is already taken.');
      return;
    }
    // Manual token entry (no URL token): verify it's genuine BEFORE advancing, so an invalid
    // token is caught here with immediate feedback — not after the whole flow at Launch.
    if (id === 'token' && !devPreview) {
      setError('');
      setVerifyingToken(true);
      const r = await checkToken(getValues('token'));
      setVerifyingToken(false);
      if (!r.ok) { setError(r.error || 'This invitation is invalid or has expired.'); return; }
      if (r.network) setNetwork(r.network);
    }
    if (id === 'review') { void handleSubmit(onSubmit)(); return; }
    setDir(1);
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setDir(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA') return;
    e.preventDefault();
    void advance();
  }

  // ── Real provisioning status poll ──────────────────────────────────────────────
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
    if (v.logoUrl) branding.logoUrl = v.logoUrl;
    if (v.supportEmail) branding.supportEmail = v.supportEmail;
    if (v.websiteUrl) branding.websiteUrl = v.websiteUrl;
    const asset = v.assetModel === 'self-issued'
      ? { model: 'self-issued', code: v.assetCode, name: v.assetName || v.assetCode, priceInr: Number(v.assetPriceInr) }
      : { model: 'external' };
    try {
      const res = await api.post('/anchor-invitations/redeem', {
        token: v.token, subdomain: v.subdomain, fullName: v.fullName,
        asset, settlementCurrency: v.settlementCurrency || 'INR',
        ...((v.minTxn || v.maxTxn) ? { limits: { minTxn: v.minTxn ? Number(v.minTxn) : undefined, maxTxn: v.maxTxn ? Number(v.maxTxn) : undefined } } : {}),
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

  // ── Up-front token verification gates (URL-token path) ───────────────────────────
  if (tokenFromUrl && tokenStatus === 'checking') {
    return (
      <ScreenShell network={network}>
        <div className="flex flex-col items-center gap-3 text-subtle">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-sm">Verifying your invitation…</p>
        </div>
      </ScreenShell>
    );
  }
  if (tokenFromUrl && tokenStatus === 'invalid') {
    return <CenterScreen network={network} icon={<AlertCircle className="h-14 w-14 text-destructive" />}
      title="This invitation isn't valid"
      body={tokenErr || 'This invitation is invalid, has expired, or has already been used. Please check the link in your approval email.'}
      cta={{ label: 'Go to login', onClick: () => router.push('/login') }} />;
  }

  // ── Terminal / async screens (own full-viewport layouts) ─────────────────────────
  if (success) return <SuccessScreen slug={slug} homeDomain={homeDomain} evidence={evidence} network={network} onLogin={() => router.push('/login')} />;
  if (gated) return <CenterScreen network={network} icon={<Clock className="h-14 w-14 text-brand" />} title="Application received — production review"
    body="Production anchors move real money and are provisioned only after a go-live review of your regulatory standing. We'll be in touch. You can sign in now to complete setup."
    cta={{ label: 'Proceed to login', onClick: () => router.push('/login') }} />;
  if (provisioning) return <ProvisioningScreen network={network} stage={stage} homeDomain={homeDomain} error={error} />;

  // ── The typeform ────────────────────────────────────────────────────────────────
  const v = getValues();
  const canBack = index > 0;
  const isLast = id === 'review';

  return (
    <div className="flex min-h-screen flex-col" onKeyDown={onKeyDown}>
      {/* thin progress line */}
      <div className="h-1 w-full bg-line">
        <motion.div className="h-full bg-brand" initial={false} animate={{ width: `${pct}%` }} transition={{ ease: [0.22, 1, 0.36, 1], duration: reduce ? 0 : 0.4 }} />
      </div>

      <Brand network={network} />

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-xl px-6 py-8 sm:px-10">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={id}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: dir > 0 ? 24 : -24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: dir > 0 ? -24 : 24 }}
              transition={{ duration: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* footer: back + OK (Enter) */}
      <footer className="px-6 py-6 sm:px-10">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={!canBack}
            className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-subtle transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-subtle sm:flex">
              press <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px]">Enter</kbd> <CornerDownLeft className="h-3 w-3" />
            </span>
            <button
              type="button"
              onClick={() => void advance()}
              disabled={isSubmitting || verifyingToken}
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-6 py-2.5 text-base font-semibold text-ink transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {(isSubmitting && isLast) || verifyingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {verifyingToken ? 'Verifying…' : id === 'welcome' ? 'Start' : isLast ? 'Launch anchor' : 'OK'}
              {!isLast && !verifyingToken && <CheckCircle2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="mx-auto mt-4 max-w-xl text-center text-sm text-destructive">{error}</p>}
      </footer>
    </div>
  );

  function renderStep() {
    const n = index + (tokenFromUrl ? 1 : 0); // human step number for the arrow badge
    switch (id) {
      case 'welcome':
        return (
          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.6rem]">
              Congratulations — you&apos;re in.
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-subtle">
              Your business passed review. Let&apos;s launch your <span className="font-medium text-ink">Stellar anchor</span> — SEP
              servers, KYC, payments, and an operator console, all wired for you.
            </p>
            <p className="mt-8 text-sm text-subtle">A few quick questions · about 2 minutes.</p>
          </div>
        );
      case 'token':
        return (
          <Q index={n} title="What's your invitation token?" helper="Paste the token from your approval email.">
            <BigInput placeholder="Paste token…" {...register('token')} autoFocus />
            {errors.token && <p className="mt-2 text-sm text-destructive">{errors.token.message}</p>}
          </Q>
        );
      case 'name':
        return (
          <Q index={n} title="First, what should we call you?" helper="The name on your operator account.">
            <BigInput placeholder="e.g. Priya Sharma" {...register('fullName')} autoFocus />
            {errors.fullName && <p className="mt-2 text-sm text-destructive">{errors.fullName.message}</p>}
          </Q>
        );
      case 'subdomain':
        return (
          <Q index={n} title="Choose your anchor's address" helper="This is where your customers and console will live.">
            <div className="flex items-end gap-1">
              <input
                placeholder="mizupay"
                {...register('subdomain')}
                autoFocus
                className="min-w-0 flex-1 border-b-2 border-line bg-transparent pb-2 text-2xl font-medium text-ink outline-none transition-colors placeholder:text-subtle/40 focus:border-brand"
              />
              <span className="pb-2 text-xl font-medium text-subtle">.nordstern.live</span>
            </div>
            {errors.subdomain ? (
              <p className="mt-2 text-sm text-destructive">{errors.subdomain.message}</p>
            ) : (
              <div className="mt-2 h-5 text-sm">
                {subState === 'checking' && <span className="inline-flex items-center gap-1.5 text-subtle"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…</span>}
                {subState === 'available' && <span className="inline-flex items-center gap-1.5 text-[color:var(--color-success)]"><CheckCircle2 className="h-3.5 w-3.5" /> {subdomainValue}.nordstern.live is available</span>}
                {subState === 'taken' && <span className="text-destructive">That subdomain is already taken.</span>}
                {subState === 'reserved' && <span className="text-destructive">That subdomain is reserved — choose another.</span>}
              </div>
            )}
          </Q>
        );
      case 'asset':
        return (
          <Q index={n} title="Which token will your customers receive?">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setValue('assetModel', 'external')}
                className={`rounded-2xl border p-4 text-left transition ${assetModel === 'external' ? 'border-brand bg-brand-50' : 'border-line hover:border-brand/50'}`}>
                <div className="flex items-center gap-2">
                  <UsdcMark className="h-5 w-5" />
                  <span className="text-base font-semibold text-ink">USDC</span>
                </div>
                <p className="mt-1.5 text-sm text-subtle">Circle USD Coin · live price</p>
              </button>
              <button type="button" disabled={network !== 'testnet'}
                onClick={() => network === 'testnet' && setValue('assetModel', 'self-issued')}
                className={`rounded-2xl border p-4 text-left transition ${
                  network !== 'testnet' ? 'cursor-not-allowed border-line opacity-50'
                    : assetModel === 'self-issued' ? 'border-brand bg-brand-50' : 'border-line hover:border-brand/50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-ink">Custom token</span>
                  {network !== 'testnet' && <span className="rounded-pill bg-surface px-2 py-0.5 text-[10px] font-medium text-subtle">Testnet only</span>}
                </div>
                <p className="mt-1.5 text-sm text-subtle">Launch your own · fixed price</p>
              </button>
            </div>

            {assetModel === 'self-issued' && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={FIELD_LABEL}>Token code</label>
                  <input placeholder="e.g. MIZU" {...register('assetCode')} className={SMALL_INPUT} />
                  {errors.assetCode && <p className="mt-1 text-xs text-destructive">{errors.assetCode.message}</p>}
                </div>
                <div>
                  <label className={FIELD_LABEL}>Token name</label>
                  <input placeholder="e.g. Mizu Token" {...register('assetName')} className={SMALL_INPUT} />
                </div>
                <div className="sm:col-span-2">
                  <label className={FIELD_LABEL}>Price (INR per token)</label>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 88.50" {...register('assetPriceInr')} className={SMALL_INPUT} />
                  {errors.assetPriceInr && <p className="mt-1 text-xs text-destructive">{errors.assetPriceInr.message}</p>}
                </div>
              </div>
            )}
          </Q>
        );
      case 'currency':
        return (
          <Q index={n} title="How do you settle?" helper="The fiat currency your customers pay in. More coming soon.">
            <div className="flex flex-wrap gap-2.5">
              {FIAT.map((f) => {
                const selected = settlementCurrency === f.value;
                return (
                  <button key={f.value} type="button" disabled={!f.available}
                    onClick={() => f.available && setValue('settlementCurrency', f.value)}
                    className={`rounded-pill border px-4 py-2 text-sm font-medium transition ${
                      !f.available ? 'cursor-not-allowed border-line text-subtle opacity-50'
                        : selected ? 'border-brand bg-brand-50 text-ink' : 'border-line text-ink hover:border-brand/50'}`}>
                    {f.value}{!f.available && <span className="ml-1.5 text-[10px] text-subtle">{COMING_SOON_LABEL}</span>}
                  </button>
                );
              })}
            </div>

            {/* Per-transaction limits, in the token the customer receives. Optional — leave
                blank for sensible sandbox defaults. Enforced by the anchor on every deposit. */}
            <div className="mt-8">
              <p className="text-sm font-medium text-ink">Transaction limits <span className="font-normal text-subtle">(optional)</span></p>
              <p className="mt-1 text-sm text-subtle">Min and max per transaction, in {watch('assetModel') === 'self-issued' ? (watch('assetCode') || 'your token') : 'USDC'}. Leave blank for defaults.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={FIELD_LABEL}>Minimum per transaction</label>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 1" {...register('minTxn')} className={SMALL_INPUT} />
                  {errors.minTxn && <p className="mt-1 text-xs text-destructive">{errors.minTxn.message}</p>}
                </div>
                <div>
                  <label className={FIELD_LABEL}>Maximum per transaction</label>
                  <input type="number" step="0.01" min="0" placeholder="e.g. 1000" {...register('maxTxn')} className={SMALL_INPUT} />
                  {errors.maxTxn && <p className="mt-1 text-xs text-destructive">{errors.maxTxn.message}</p>}
                </div>
              </div>
            </div>
          </Q>
        );
      case 'brand':
        return (
          <Q index={n} title="Brand your anchor" helper="Optional — make it feel like your product. Leave blank for the NordStern default.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={FIELD_LABEL}>Display name</label>
                <input placeholder="e.g. MizuPay" {...register('displayName')} className={SMALL_INPUT} />
              </div>
              <div className="sm:col-span-2">
                <input type="hidden" {...register('logoUrl')} />
                <LogoUpload value={watch('logoUrl')} onChange={(url) => setValue('logoUrl', url, { shouldValidate: true })} />
                {errors.logoUrl && <p className="mt-1 text-xs text-destructive">{errors.logoUrl.message}</p>}
              </div>
              <div>
                <label className={FIELD_LABEL}>Support email</label>
                <input placeholder="support@mizupay.io" {...register('supportEmail')} className={SMALL_INPUT} />
                {errors.supportEmail && <p className="mt-1 text-xs text-destructive">{errors.supportEmail.message}</p>}
              </div>
              <div>
                <label className={FIELD_LABEL}>Website</label>
                <input placeholder="https://mizupay.io" {...register('websiteUrl')} className={SMALL_INPUT} />
                {errors.websiteUrl && <p className="mt-1 text-xs text-destructive">{errors.websiteUrl.message}</p>}
              </div>
            </div>
          </Q>
        );
      case 'payment':
        return (
          <Q index={n} title="Connect your on-ramp"
            helper="Razorpay is required — anchors launch on a real on-ramp (use test-mode keys for a sandbox anchor). Stored in our secret store, never shown again.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={FIELD_LABEL}>Razorpay Key ID</label>
                <input placeholder="rzp_test_…" {...register('razorpayKeyId')} className={SMALL_INPUT} />
                {errors.razorpayKeyId && <p className="mt-1 text-xs text-destructive">{errors.razorpayKeyId.message}</p>}
              </div>
              <div>
                <label className={FIELD_LABEL}>Razorpay Key Secret</label>
                <input type="password" placeholder="••••••••" {...register('razorpayKeySecret')} className={SMALL_INPUT} />
                {errors.razorpayKeySecret && <p className="mt-1 text-xs text-destructive">{errors.razorpayKeySecret.message}</p>}
              </div>
              <div>
                <label className={FIELD_LABEL}>Cashfree App ID <span className="font-normal text-subtle/70">(optional)</span></label>
                <input placeholder="CF…" {...register('cashfreeAppId')} className={SMALL_INPUT} />
              </div>
              <div>
                <label className={FIELD_LABEL}>Cashfree Secret <span className="font-normal text-subtle/70">(optional)</span></label>
                <input type="password" placeholder="••••••••" {...register('cashfreeSecretKey')} className={SMALL_INPUT} />
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              Keys go straight to the secret store — never in a database, never shown again.
            </p>
          </Q>
        );
      case 'review':
        return (
          <Q index={n} title="Ready to launch">
            <dl className="divide-y divide-line rounded-2xl border border-line">
              <ReviewRow label="Your name" value={v.fullName || '—'} />
              <ReviewRow label="Anchor" value={`${v.subdomain || '—'}.nordstern.live`} />
              <ReviewRow label="Token" value={v.assetModel === 'self-issued' ? `${v.assetCode || '—'} · ₹${v.assetPriceInr || '—'} (custom)` : 'USDC · live price'} />
              <ReviewRow label="Settlement" value={v.settlementCurrency || 'INR'} />
              <ReviewRow label="Limits / txn" value={(v.minTxn || v.maxTxn) ? `${v.minTxn || '0'} – ${v.maxTxn || '∞'}` : 'Default'} />
              <ReviewRow label="Brand" value={v.displayName || 'NordStern default'} />
              <ReviewRow label="On-ramp" value={v.razorpayKeyId ? `Razorpay ${v.razorpayKeyId.startsWith('rzp_live_') ? 'LIVE' : 'test'}` : '—'} />
            </dl>
            <p className="mt-5 flex items-center gap-2 text-sm text-subtle">
              <Palette className="h-4 w-4 text-brand" /> You can change branding later in your console.
            </p>
          </Q>
        );
    }
  }
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-sm text-subtle">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

// ── Async / terminal full-screen states ─────────────────────────────────────────
function ScreenShell({ network, children }: { network: 'testnet' | 'mainnet'; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Brand network={network} />
      <main className="flex flex-1 items-center justify-center px-6 py-10">{children}</main>
    </div>
  );
}

function CenterScreen({ network, icon, title, body, cta }: {
  network: 'testnet' | 'mainnet'; icon: React.ReactNode; title: string; body: string; cta?: { label: string; onClick: () => void };
}) {
  return (
    <ScreenShell network={network}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">{icon}</div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-subtle">{body}</p>
        {cta && (
          <button onClick={cta.onClick} className="mt-8 inline-flex items-center gap-2 rounded-pill bg-brand px-6 py-2.5 text-base font-semibold text-ink transition-colors hover:bg-brand-600">
            {cta.label}
          </button>
        )}
      </motion.div>
    </ScreenShell>
  );
}

function ProvisioningScreen({ network, stage, homeDomain, error }: { network: 'testnet' | 'mainnet'; stage: string | null; homeDomain: string | null; error: string }) {
  const current = stageToStep(stage);
  return (
    <ScreenShell network={network}>
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Provisioning your anchor</h1>
        <p className="mt-3 text-base text-subtle">Launching your dedicated infrastructure on Stellar.</p>
        <ol className="mt-8 space-y-3">
          {STEPS.map((label, i) => {
            const state = i < current ? 'done' : i === current ? 'running' : 'pending';
            return (
              <li key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${state === 'running' ? 'border-brand/40 bg-brand-50' : 'border-line'}`}>
                <span className="mt-0.5 shrink-0">
                  {state === 'done' && <CheckCircle2 className="h-5 w-5 text-brand" />}
                  {state === 'running' && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
                  {state === 'pending' && <span className="block h-5 w-5 rounded-full border-2 border-line" />}
                </span>
                <div className="flex-1">
                  <span className={state === 'pending' ? 'text-subtle' : 'font-medium text-ink'}>{label}</span>
                  {state === 'running' && stage && <p className="mt-0.5 text-sm text-subtle">{stage}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {homeDomain && <p className="mt-6 text-center text-sm text-subtle">Live at <span className="font-medium text-ink">{homeDomain}</span></p>}
        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
      </div>
    </ScreenShell>
  );
}

function SuccessScreen({ slug, homeDomain, evidence, network, onLogin }: {
  slug: string; homeDomain: string | null; evidence: Evidence | null; network: 'testnet' | 'mainnet'; onLogin: () => void;
}) {
  const domain = homeDomain ?? (slug ? `${slug}.nordstern.live` : null);
  const consoleUrl = slug ? `https://console-${slug}.nordstern.live` : null;
  const net = evidence?.network ?? (network === 'mainnet' ? 'public' : 'testnet');
  const expert = (acct: string) => `https://stellar.expert/explorer/${net}/account/${acct}`;
  return (
    <ScreenShell network={network}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><CheckCircle2 className="h-16 w-16 text-brand" /></div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">Your anchor is live</h1>
        <p className="mt-3 text-center text-base text-subtle">Isolated stack up, routing wired, and discoverable on Stellar.</p>

        <div className="mt-8 space-y-3 rounded-2xl border border-line p-5 text-sm">
          {domain && <EvidenceRow label="Anchor">
            <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="break-all text-brand hover:underline">{domain}</a>
          </EvidenceRow>}
          {evidence?.assetCode && <EvidenceRow label="Asset">
            <span className="font-medium text-ink">{evidence.assetCode}</span><span className="text-subtle"> · {net}</span>
          </EvidenceRow>}
          {evidence?.issuer && <EvidenceRow label="Issuer">
            <a href={expert(evidence.issuer)} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-brand hover:underline">
              {evidence.issuer.slice(0, 8)}…{evidence.issuer.slice(-6)} ↗
            </a>
          </EvidenceRow>}
        </div>

        {consoleUrl ? (
          <a href={consoleUrl} target="_blank" rel="noreferrer" className="mt-6 block">
            <button className="w-full rounded-pill bg-brand py-3 text-base font-semibold text-ink transition-colors hover:bg-brand-600">Open your operator console ↗</button>
          </a>
        ) : (
          <button onClick={onLogin} className="mt-6 w-full rounded-pill bg-brand py-3 text-base font-semibold text-ink transition-colors hover:bg-brand-600">Proceed to login</button>
        )}
      </motion.div>
    </ScreenShell>
  );
}

function EvidenceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-subtle">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center text-subtle">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    }>
      <RedeemTypeform />
    </Suspense>
  );
}
