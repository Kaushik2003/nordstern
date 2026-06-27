'use client';

import { useEffect, useState } from 'react';
import { getConfig, saveConfig, TenantConfig } from '@/lib/cp';

const DEFAULTS: TenantConfig = {
  min_deposit: 10, max_deposit: 10000,
  min_withdrawal: 10, max_withdrawal: 5000,
  daily_limit: 25000,
  deposit_fee_pct: 0.015, withdrawal_fee_pct: 0.010,
  fiat_method_name: 'Wire Transfer', fiat_bank_name: '',
  fiat_account_number: '', fiat_routing_number: '',
  settlement_days: 1,
  alert_mismatch_pct: 0.01, alert_large_tx: 5000,
  webhook_url: '',
};

export default function RulesPage() {
  const [cfg, setCfg]       = useState<TenantConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    getConfig().then(c => { if (c.min_deposit) setCfg(c); }).finally(() => setLoading(false));
  }, []);

  function set<K extends keyof TenantConfig>(k: K, v: TenantConfig[K]) {
    setCfg(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await saveConfig(cfg);
    setSaved(true);
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Business Rules</h1>
        {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Transaction Limits */}
        <Section title="Transaction Limits">
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Min deposit ($)" value={cfg.min_deposit} onChange={v => set('min_deposit', v)} />
            <NumField label="Max deposit ($)" value={cfg.max_deposit} onChange={v => set('max_deposit', v)} />
            <NumField label="Min withdrawal ($)" value={cfg.min_withdrawal} onChange={v => set('min_withdrawal', v)} />
            <NumField label="Max withdrawal ($)" value={cfg.max_withdrawal} onChange={v => set('max_withdrawal', v)} />
          </div>
          <NumField label="Daily limit per user ($)" value={cfg.daily_limit} onChange={v => set('daily_limit', v)} />
        </Section>

        {/* Fees */}
        <Section title="Fees">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Deposit fee</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.001" min="0" max="1" value={cfg.deposit_fee_pct}
                  onChange={e => set('deposit_fee_pct', Number(e.target.value))}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <span className="text-slate-400 text-sm">({(cfg.deposit_fee_pct * 100).toFixed(1)}%)</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Withdrawal fee</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.001" min="0" max="1" value={cfg.withdrawal_fee_pct}
                  onChange={e => set('withdrawal_fee_pct', Number(e.target.value))}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <span className="text-slate-400 text-sm">({(cfg.withdrawal_fee_pct * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Fiat Rail */}
        <Section title="Fiat Rail" sub="What users see in the deposit/withdrawal form">
          <StrField label="Payment method name" value={cfg.fiat_method_name} onChange={v => set('fiat_method_name', v)} placeholder="Wire Transfer" />
          <StrField label="Bank name" value={cfg.fiat_bank_name} onChange={v => set('fiat_bank_name', v)} placeholder="First National Bank" />
          <div className="grid grid-cols-2 gap-4">
            <StrField label="Account number" value={cfg.fiat_account_number} onChange={v => set('fiat_account_number', v)} placeholder="4821-7700" />
            <StrField label="Routing number" value={cfg.fiat_routing_number} onChange={v => set('fiat_routing_number', v)} placeholder="021000021" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Settlement time</label>
            <select value={cfg.settlement_days} onChange={e => set('settlement_days', Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              {[0, 1, 2, 3].map(d => <option key={d} value={d}>{d === 0 ? 'Same day (T+0)' : `T+${d}`}</option>)}
            </select>
          </div>
        </Section>

        {/* KYC */}
        <Section title="KYC Tiers" sub="Simulated — connect a KYC provider in production">
          <div className="space-y-2 opacity-75">
            {[
              { tier: 'Tier 0', limit: 'Up to $500/mo', req: 'No KYC required' },
              { tier: 'Tier 1', limit: 'Up to $3,000/mo', req: 'Email verification' },
              { tier: 'Tier 2', limit: 'Unlimited', req: 'ID + selfie (KYC provider)' },
            ].map(t => (
              <div key={t.tier} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 text-sm">
                <span className="text-slate-300 font-medium">{t.tier} — {t.limit}</span>
                <span className="text-slate-400">{t.req}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Alerts */}
        <Section title="Alerts">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Reconciliation alert threshold</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.001" min="0" max="1" value={cfg.alert_mismatch_pct}
                  onChange={e => set('alert_mismatch_pct', Number(e.target.value))}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                <span className="text-slate-400 text-sm">({(cfg.alert_mismatch_pct * 100).toFixed(1)}%)</span>
              </div>
            </div>
            <NumField label="Large transaction alert ($)" value={cfg.alert_large_tx} onChange={v => set('alert_large_tx', v)} />
          </div>
          <StrField label="Webhook URL" value={cfg.webhook_url} onChange={v => set('webhook_url', v)} placeholder="https://your-bank.com/webhooks/stellar" />
        </Section>

        {/* Compliance */}
        <Section title="Compliance" sub="Simulated for demo purposes">
          <div className="space-y-2">
            {['OFAC screening enabled', 'Transaction monitoring active'].map(item => (
              <label key={item} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3 cursor-pointer opacity-75">
                <input type="checkbox" defaultChecked className="accent-blue-500" />
                <span className="text-sm text-slate-300">{item}</span>
              </label>
            ))}
          </div>
        </Section>

        <button type="submit" disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors">
          {saving ? 'Saving...' : 'Save Business Rules'}
        </button>
      </form>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-sm text-slate-400 block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function StrField({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm text-slate-400 block mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500" />
    </div>
  );
}
