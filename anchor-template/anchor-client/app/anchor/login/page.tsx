'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/cp';
import { Logo, Button, Card, Field } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      router.push('/anchor/anchors');
    } catch (err: any) {
      setError(err.message); setLoading(false);
    }
  }

  return (
    <div className="aurora flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8 flex justify-center"><Logo className="text-lg" /></div>
        <Card className="p-8">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Sign in to your anchor console.</p>

          {error && <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="ops@acme.com" required />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••••" required />
            <Button type="submit" disabled={loading} className="mt-2 w-full">{loading ? 'Signing in…' : 'Sign in →'}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          No account? <Link href="/anchor/signup" className="text-brand hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
