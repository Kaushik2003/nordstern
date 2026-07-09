'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@nordstern/shared-auth';
import { Button } from '@nordstern/shared-ui';
import { Input } from '@nordstern/shared-ui';
import { Label } from '@nordstern/shared-ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@nordstern/shared-ui';
import { ShieldCheck } from 'lucide-react';

// NordStern INTERNAL admin sign-in. A demo password gate (default admin / admin),
// isolated from operator + customer auth. Stand-in for the real super-admin role.
export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/admin/login', { username: username.trim(), password });
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xl font-semibold tracking-tight">
            Nord<span className="text-brand">Stern</span> <span className="text-muted-foreground font-normal">Admin</span>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Internal sign-in</CardTitle>
            <CardDescription>NordStern staff only — application review & approval.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !username || !password}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">Demo gate — replace with a super-admin role before production.</p>
      </div>
    </div>
  );
}
