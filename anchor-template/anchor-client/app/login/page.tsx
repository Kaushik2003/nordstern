'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { customer as api, ApiError } from '@/lib/customer';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Button, Spinner, Badge, ProviderChip } from '@/components/ui';
import { BrandMark } from '@/components/brand-mark';
import { NordSternMark, DiditMark, StellarMark } from '@/components/ecosystem';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const brand = useBrand();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { customer, loading: sessionLoading, setCustomer } = useCustomer();
  const [step, setStep] = useState<'email' | 'code' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!sessionLoading && customer) router.replace('/home'); }, [customer, sessionLoading, router]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.requestOtp(email.trim(), brand.name); setStep('code'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not send code'); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { customer: c, isNew } = await api.verifyOtp(email.trim(), code.trim());
      setCustomer(c);
      // First-time (or nameless) customers: ask their name so the app feels personal from
      // the first screen. Returning customers with a name go straight in.
      if (isNew || !c.fullName) { setStep('name'); }
      else { router.replace('/home'); }
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not verify code'); }
    finally { setBusy(false); }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const trimmed = name.trim();
      if (trimmed) setCustomer(await api.updateProfile({ fullName: trimmed }));
      router.replace('/home');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save your name'); }
    finally { setBusy(false); }
  }

  function skipName() { router.replace('/home'); }

  // SSR-safe: server + first client paint render the resting state (initial={false}); the
  // entrance runs after mount, so hydration never diverges on reduced-motion preference.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const swap = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  const heading = step === 'email' ? 'Welcome back' : step === 'code' ? 'Check your email' : 'What should we call you?';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8"
      style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 16%, #fff) 0%, #fff 45%, color-mix(in srgb, var(--color-brand) 22%, #fff) 100%)' }}
    >
      {/* Decorative angular brand shapes — accent-driven so they re-skin per anchor. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-[26rem] rotate-[28deg] rounded-[4rem] blur-[6px]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 30%, transparent), color-mix(in srgb, var(--color-brand) 14%, transparent))' }} />
        <div className="absolute -left-10 top-40 size-72 rotate-12 rounded-[3rem] blur-[2px]" style={{ background: 'color-mix(in srgb, var(--color-brand) 24%, transparent)' }} />
        <div className="absolute -bottom-32 -right-24 size-[30rem] -rotate-12 rounded-[5rem] blur-[6px]" style={{ background: 'linear-gradient(45deg, color-mix(in srgb, var(--color-brand) 28%, transparent), color-mix(in srgb, var(--color-aurora-lilac) 22%, transparent))' }} />
        <div className="absolute bottom-10 right-40 size-56 rotate-[24deg] rounded-[3rem] blur-[2px]" style={{ background: 'color-mix(in srgb, var(--color-brand) 16%, transparent)' }} />
      </div>

      <motion.div
        initial={false}
        animate={mounted && !reduce ? { opacity: [0, 1], y: [14, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative grid w-full max-w-5xl overflow-hidden rounded-card bg-canvas p-3 shadow-[0_40px_120px_-45px_rgba(75,63,158,0.4)] sm:p-4 lg:grid-cols-2"
      >
        {/* ── Left: auth ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-12">
          <div className="mx-auto w-full max-w-sm">
            {/* Anchor brand + environment */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark size={36} />
                <span className="text-lg font-semibold tracking-tight text-ink">{brand.name}</span>
              </div>
              <Badge tone={brand.network === 'mainnet' ? 'success' : 'info'}>{brand.network === 'mainnet' ? 'Mainnet' : 'Testnet'}</Badge>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} {...swap} transition={{ duration: 0.35, ease: EASE }}>
                <h1 className="text-3xl font-bold tracking-tight text-ink">{heading}</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                  {step === 'email'
                    ? 'Sign in securely using your email. No passwords — just a one-time verification code.'
                    : step === 'code'
                      ? <>Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span>.</>
                      : 'Add your name so your account feels like yours. You can change it anytime.'}
                </p>

                {step === 'email' && (
                  <form onSubmit={sendCode} className="mt-6 space-y-3">
                    <div className="flex items-center rounded-xl border border-line bg-canvas px-3.5 transition-colors duration-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                      <Mail className="size-[18px] text-subtle" />
                      <input
                        type="email" required autoFocus inputMode="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                        className="w-full bg-transparent px-3 py-3.5 text-[15px] text-ink outline-none placeholder:text-subtle"
                      />
                    </div>
                    {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                    <Button type="submit" variant="gradient" size="block" disabled={busy || !email}>
                      {busy ? <Spinner className="h-5 w-5" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                    <p className="text-center text-xs text-subtle">No passwords. We&apos;ll send a secure one-time code.</p>
                  </form>
                )}

                {step === 'code' && (
                  <form onSubmit={verify} className="mt-6 space-y-4">
                    <OtpBoxes value={code} onChange={setCode} onComplete={() => { /* submit is manual */ }} />
                    {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                    <Button type="submit" variant="gradient" size="block" disabled={busy || code.length < 4}>
                      {busy ? <Spinner className="h-5 w-5" /> : 'Verify & continue'}
                    </Button>
                    <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
                      className="w-full text-center text-sm font-medium text-muted transition-colors hover:text-ink">
                      Use a different email
                    </button>
                  </form>
                )}

                {step === 'name' && (
                  <form onSubmit={saveName} className="mt-6 space-y-3">
                    <input
                      autoFocus placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                      className="h-12 w-full rounded-xl border border-line bg-canvas px-4 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 placeholder:text-subtle"
                    />
                    {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                    <Button type="submit" variant="gradient" size="block" disabled={busy}>
                      {busy ? <Spinner className="h-5 w-5" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                    <button type="button" onClick={skipName}
                      className="w-full text-center text-sm font-medium text-muted transition-colors hover:text-ink">
                      Skip for now
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Provider trust rail — the ecosystem behind this anchor. */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <ProviderChip label="Identity"><DiditMark /></ProviderChip>
              <ProviderChip label="Infrastructure"><NordSternMark className="text-xs" /></ProviderChip>
              <ProviderChip label="Settlement"><StellarMark className="text-xs" /></ProviderChip>
            </div>
          </div>
        </div>

        {/* ── Right: anchor promo (desktop) ───────────────────────────────────── */}
        <div className="relative hidden overflow-hidden rounded-[1.5rem] bg-surface lg:block">
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(circle at center, color-mix(in srgb, var(--color-brand) 35%, transparent), transparent 70%)', animation: 'aurora-drift 14s ease-in-out infinite' }} />
          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-2.5">
              <BrandMark size={40} />
              <span className="text-lg font-semibold tracking-tight text-ink">{brand.name}</span>
            </div>

            <div className="max-w-sm">
              <h2 className="text-3xl font-bold leading-[1.15] tracking-tight text-ink">
                Buy, sell and move {brand.assetCode} securely.
              </h2>
              <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-relaxed text-muted">
                Turn {brand.fiatCurrency} into {brand.assetCode} and back — secured by <DiditMark className="text-sm" />, settled on{' '}
                <StellarMark className="text-sm" />.
              </p>
              <div className="mt-6 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand-200" />
                <span className="size-1.5 rounded-full bg-brand-200" />
                <span className="h-1.5 w-6 rounded-full bg-brand-700" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-subtle">
              <span>Provisioned by</span>
              <NordSternMark className="text-[11px]" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Six-box OTP entry backed by the `code` string (single source of truth for verify()).
// A pure presentation upgrade over the old single field — same value, nicer input.
function OtpBoxes({ value, onChange, onComplete }: { value: string; onChange: (v: string) => void; onComplete?: () => void }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  function setDigit(i: number, raw: string) {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[i] = d;
    const joined = next.join('').slice(0, 6);
    onChange(joined);
    if (d && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
    if (joined.length === 6) onComplete?.();
  }
  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { e.preventDefault(); onChange(pasted); if (pasted.length === 6) onComplete?.(); }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-3 py-2 transition-colors duration-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
      {digits.map((d, i) => (
        <input
          key={i} id={`otp-${i}`} value={d} inputMode="numeric" maxLength={1} autoFocus={i === 0}
          onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)} onPaste={onPaste}
          placeholder="0"
          className="h-12 w-full min-w-0 rounded-lg bg-transparent text-center text-xl font-semibold text-ink outline-none placeholder:text-line focus:bg-surface"
        />
      ))}
    </div>
  );
}
