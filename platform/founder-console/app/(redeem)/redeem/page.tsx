'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { api, ApiError } from '@nordstern/shared-auth';
import { CheckCircle2, Loader2, Clock, ArrowRight, ArrowLeft, CornerDownLeft, Coins, ShieldCheck, Palette } from 'lucide-react';
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
  displayName: z.string().optional(),
  accent: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Use a hex color like #2563EB').optional().or(z.literal('')),
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
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="NordStern" width={28} height={28} className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-ink">Nord</span><span className="text-brand">Stern</span>
        </span>
      </div>
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

  const tokenFromUrl = !!searchParams.get('token');

  const { register, handleSubmit, setValue, watch, trigger, getValues, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      token: searchParams.get('token') || '', subdomain: '', fullName: '',
      assetModel: 'external', settlementCurrency: 'INR',
    },
  });
  const accentValue = watch('accent');
  const assetModel = watch('assetModel');
  const settlementCurrency = watch('settlementCurrency');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setValue('token', token);
    if (token) {
      api.get(`/anchor-invitations/verify?token=${encodeURIComponent(token)}`)
        .then((r: any) => { if (r?.network === 'testnet' || r?.network === 'mainnet') setNetwork(r.network); })
        .catch(() => {});
    }
  }, [searchParams, setValue]);

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
    asset: ['assetModel', 'assetCode', 'assetName', 'assetPriceInr'], currency: ['settlementCurrency'],
    brand: ['accent', 'logoUrl', 'supportEmail', 'websiteUrl'], payment: ['razorpayKeyId', 'razorpayKeySecret'], review: [],
  };

  async function advance() {
    const fields = validators[id];
    if (fields.length) {
      const ok = await trigger(fields as any);
      if (!ok) return;
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
    if (v.accent) branding.accent = v.accent;
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-6 py-2.5 text-base font-semibold text-ink transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting && isLast ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {id === 'welcome' ? 'Start' : isLast ? 'Launch anchor' : 'OK'}
              {!isLast && <CheckCircle2 className="h-4 w-4" />}
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
              Launch your <span className="text-brand">Stellar anchor</span>.
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-subtle">
              A few quick questions and your on/off-ramp goes live — SEP servers, KYC, payments, and an operator console, all wired for you.
            </p>
            <p className="mt-8 text-sm text-subtle">Takes about 2 minutes.</p>
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
            {errors.subdomain && <p className="mt-2 text-sm text-destructive">{errors.subdomain.message}</p>}
          </Q>
        );
      case 'asset':
        return (
          <Q index={n} title="Which token will your customers receive?">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setValue('assetModel', 'external')}
                className={`rounded-2xl border p-4 text-left transition ${assetModel === 'external' ? 'border-brand bg-brand-50' : 'border-line hover:border-brand/50'}`}>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-brand" />
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
                <label className={FIELD_LABEL}>Logo URL</label>
                <input placeholder="https://…/logo.png" {...register('logoUrl')} className={SMALL_INPUT} />
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
