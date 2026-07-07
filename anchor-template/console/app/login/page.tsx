'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Operator sign-in — email + OTP only, no passwords. Proxies same-origin to platform-api
// /auth/otp/* (host-only cookie binds to this console's origin; same session plumbing).
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/otp/request', { email: email.trim() }); setStep('code'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not send code'); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/auth/otp/verify', { email: email.trim(), code: code.trim() }); router.replace('/overview'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not verify code'); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-[var(--color-brand-ink)]">N</div>
          <h1 className="text-lg font-semibold text-ink">Operator Console</h1>
          <p className="text-sm text-subtle">Sign in to manage your anchor</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{step === 'email' ? 'Sign in' : 'Enter your code'}</CardTitle>
            <CardDescription>{step === 'email' ? 'We’ll email you a one-time code' : `Sent to ${email}`}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            {step === 'email' ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoFocus placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" variant="brand" className="w-full" disabled={busy || !email}>{busy ? 'Sending…' : 'Continue'}</Button>
                <p className="text-center text-xs text-subtle">No passwords — just a code.</p>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input id="code" inputMode="numeric" autoFocus maxLength={6} placeholder="000000"
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-lg tracking-[0.4em]" />
                </div>
                <Button type="submit" variant="brand" className="w-full" disabled={busy || code.length < 4}>{busy ? 'Verifying…' : 'Sign in'}</Button>
                <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full text-center text-sm text-subtle hover:text-ink">Use a different email</button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-subtle">powered by NordStern</p>
      </div>
    </div>
  );
}
