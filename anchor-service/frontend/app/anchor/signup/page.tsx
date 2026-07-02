'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/cp';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(email, password);
      router.push('/anchor/anchors');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/anchor" className="block text-center text-2xl font-bold mb-8">
          <span className="text-blue-400">⚓</span> Dockyard
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Create your operator account</h1>
          <p className="text-slate-400 text-sm mb-6">You'll create and manage your anchors from the console.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="ops@acme.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••••" />

            <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium mt-2 transition-colors">
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/anchor/login" className="text-blue-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-sm text-slate-400 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}
