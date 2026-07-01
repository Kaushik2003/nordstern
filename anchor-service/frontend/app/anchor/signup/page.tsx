'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/cp';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', network: 'testnet' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await register(form.name, form.email, form.password, form.network);
      // Store tenantId for onboarding
      localStorage.setItem('cp_tenant_id', user.tenantId);
      router.push('/anchor/onboarding');
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
          <h1 className="text-xl font-bold mb-6">Create your anchor</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Company name" type="text" value={form.name} onChange={v => set('name', v)} placeholder="ACME Remittance" />
            <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="ops@acme.com" />
            <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder="••••••••••••" />

            <div>
              <label className="text-sm text-slate-400 block mb-2">Network</label>
              <div className="space-y-2">
                {[
                  { value: 'testnet', label: 'Testnet', sub: 'Free, instant — Friendbot funded' },
                  { value: 'mainnet', label: 'Mainnet', sub: 'Fund accounts manually with XLM' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.network === opt.value ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                    <input type="radio" name="network" value={opt.value} checked={form.network === opt.value} onChange={() => set('network', opt.value)} className="mt-1 accent-blue-500" />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-slate-400">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium mt-2 transition-colors">
              {loading ? 'Creating anchor...' : 'Create Anchor →'}
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
