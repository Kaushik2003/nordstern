'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Operator sign-in — email + OTP only. No passwords.
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
    try { await api.post('/auth/otp/verify', { email: email.trim(), code: code.trim() }); router.push('/overview'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not verify code'); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step === 'email' ? 'Sign in' : 'Enter your code'}</CardTitle>
        <CardDescription>
          {step === 'email' ? 'We’ll email you a one-time sign-in code.' : `Sent to ${email}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoFocus placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !email}>{busy ? 'Sending…' : 'Continue'}</Button>
            <p className="text-center text-xs text-muted-foreground">No passwords — just a code.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" inputMode="numeric" autoFocus maxLength={6} placeholder="000000"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-lg tracking-[0.4em]" />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 4}>{busy ? 'Verifying…' : 'Sign in'}</Button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">Use a different email</button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
