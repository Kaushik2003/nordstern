'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, ShieldCheck, Zap, KeyRound, Server, ChevronRight } from 'lucide-react';
import { customer as api, ApiError } from '@/lib/customer';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Button, Input, Spinner, Badge } from '@/components/ui';
import { BrandMark } from '@/components/brand-mark';
import { NordSternMark, DiditMark, StellarMark, ENVIRONMENT, IS_PRODUCTION } from '@/components/ecosystem';

export default function LoginPage() {
  const brand = useBrand();
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[6fr_5fr]">
      {/* ── Left: brand story (desktop only) ──────────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 lg:flex xl:p-16">
        {/* Flat brand motif — concentric rings + solid circles (no gradient), landing purple. */}
        <div aria-hidden className="pointer-events-none absolute -bottom-52 -right-52 h-[38rem] w-[38rem]">
          <div className="absolute inset-0 rounded-full border border-brand/25" />
          <div className="absolute inset-[10%] rounded-full border border-brand/20" />
          <div className="absolute inset-[22%] rounded-full border border-brand/15" />
          <div className="absolute inset-[36%] rounded-full bg-brand-100" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="text-lg font-semibold text-ink">{brand.name}</span>
          </div>
          <Badge tone={IS_PRODUCTION ? 'success' : 'info'}>{ENVIRONMENT}</Badge>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink xl:text-5xl">
            Buy, sell and move digital assets securely.
          </h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <span>Provisioned by</span>
            <NordSternMark className="text-sm" />
          </div>

          {/* Trust feature rows */}
          <div className="mt-10 space-y-4">
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Secure identity" sub={<>Verified through <DiditMark /></>} />
            <Feature icon={<Zap className="h-5 w-5" />} title="Fast settlements" sub={<>Powered by <StellarMark className="text-[13px]" /></>} />
            <Feature icon={<KeyRound className="h-5 w-5" />} title="Passwordless login" sub="Secure one-time email codes" />
            <Feature icon={<Server className="h-5 w-5" />} title="Trusted infrastructure" sub={<>Provisioned by <NordSternMark className="text-[13px]" /></>} />
          </div>
        </div>

        {/* Ecosystem chain */}
        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
          <span className="font-medium text-muted">{brand.name}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Infrastructure</span> <NordSternMark className="text-xs" />
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Identity</span> <DiditMark />
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Settlement</span> <StellarMark className="text-xs" />
        </div>
      </aside>

      {/* ── Right: auth panel ─────────────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile brand header (left panel is hidden below lg) */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <BrandMark size={32} />
              <span className="text-base font-semibold text-ink">{brand.name}</span>
            </div>
            <Badge tone={IS_PRODUCTION ? 'success' : 'info'}>{ENVIRONMENT}</Badge>
          </div>

          <div className="rounded-3xl border border-line bg-canvas p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)]">
            <div className="mb-6">
              <p className="text-sm font-medium text-brand-deep">{brand.name}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
                {step === 'email' ? 'Welcome back' : step === 'code' ? 'Check your email' : 'What should we call you?'}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {step === 'email'
                  ? 'Sign in securely using your email. No passwords — just a one-time verification code.'
                  : step === 'code'
                    ? <>Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span>.</>
                    : 'Add your name so your account feels like yours. You can change it anytime.'}
              </p>
            </div>

            {step === 'name' ? (
              <form onSubmit={saveName} className="space-y-3">
                <Input autoFocus placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                <Button type="submit" size="block" disabled={busy}>
                  {busy ? <Spinner className="h-5 w-5" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <button type="button" onClick={skipName} className="w-full pt-1 text-center text-sm text-muted hover:text-ink">
                  Skip for now
                </button>
              </form>
            ) : step === 'email' ? (
              <form onSubmit={sendCode} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <Input type="email" required autoFocus inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11" />
                </div>
                {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                <Button type="submit" size="block" disabled={busy || !email}>
                  {busy ? <Spinner className="h-5 w-5" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <p className="pt-1 text-center text-xs text-faint">No passwords. We&apos;ll send a secure one-time code.</p>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-3">
                <Input inputMode="numeric" autoFocus maxLength={6} placeholder="000000" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-2xl tracking-[0.5em]" />
                {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
                <Button type="submit" size="block" disabled={busy || code.length < 4}>
                  {busy ? <Spinner className="h-5 w-5" /> : 'Verify & continue'}
                </Button>
                <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full pt-1 text-center text-sm text-muted hover:text-ink">
                  Use a different email
                </button>
              </form>
            )}
          </div>

          {/* Trust footer — provider attribution */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <FooterCol label="Identity" mark={<DiditMark />} />
            <FooterCol label="Infrastructure" mark={<NordSternMark className="text-xs" />} />
            <FooterCol label="Settlement" mark={<StellarMark className="text-xs" />} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-canvas text-brand-deep">{icon}</div>
      <div>
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="flex items-center gap-1 text-[13px] text-muted">{sub}</p>
      </div>
    </div>
  );
}

function FooterCol({ label, mark }: { label: string; mark: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-2 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <div className="mt-1 flex justify-center">{mark}</div>
    </div>
  );
}
