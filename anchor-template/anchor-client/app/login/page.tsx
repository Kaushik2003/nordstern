'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import { customer as api, ApiError } from '@/lib/customer';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Button, Input, Spinner } from '@/components/ui';
import { BrandMark } from '@/components/brand-mark';

export default function LoginPage() {
  const brand = useBrand();
  const router = useRouter();
  const { customer, loading: sessionLoading, setCustomer } = useCustomer();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!sessionLoading && customer) router.replace('/home'); }, [customer, sessionLoading, router]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.requestOtp(email.trim()); setStep('code'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not send code'); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { customer: c } = await api.verifyOtp(email.trim(), code.trim());
      setCustomer(c);
      router.replace('/home');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not verify code'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size={56} />
        <h1 className="mt-4 text-2xl font-bold text-ink">{brand.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {step === 'email' ? 'Sign in or create your account' : `Enter the code we sent to ${email}`}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input type="email" required autoFocus inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11" />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" size="block" disabled={busy || !email}>
            {busy ? <Spinner className="h-5 w-5" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="pt-2 text-center text-xs text-faint">No passwords. We&apos;ll email you a one-time code.</p>
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
  );
}
