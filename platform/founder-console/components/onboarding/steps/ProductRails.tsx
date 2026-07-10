'use client';

import { useFormContext } from 'react-hook-form';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { OnboardingFormState } from '@/lib/validations/onboarding';
import { MODES, RAILS } from '@/lib/onboarding/availability';
import { OptionPill } from '@/components/onboarding/OptionPill';
import { Label } from '@nordstern/shared-ui';
import { Input } from '@nordstern/shared-ui';
import { cn } from '@nordstern/shared-ui';
import { FlaskConical, Rocket, Lightbulb, ChevronDown } from 'lucide-react';

// Copy stays factual about availability. It must not state a regulatory or licensing
// rationale — see AGENTS.md §5: we do not publish compliance conclusions in the UI.
const MODE_DETAIL: Record<string, { desc: string; icon: React.ReactNode }> = {
  test: {
    desc: 'Provision a full sandbox anchor on Stellar testnet. No legal verification, no real money. Start in minutes.',
    icon: <FlaskConical className="h-5 w-5" />,
  },
  production: {
    desc: 'Real money on Stellar mainnet, with your own liquidity and bank relationship.',
    icon: <Rocket className="h-5 w-5" />,
  },
};

const FEE_TYPES = ['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'] as const;

const panelMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export function ProductRails() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormState>();
  const reduceMotion = useReducedMotion();

  const selectedRails = watch('product.supportedRails') || [];
  const feeType = watch('product.feeArchitectureType');
  const mode = watch('product.mode');
  const fiat = watch('companyProfile.supportedFiat') || 'INR';

  const toggleRail = (rail: string) => {
    if (selectedRails.includes(rail)) {
      setValue('product.supportedRails', selectedRails.filter((r) => r !== rail), { shouldValidate: true });
    } else {
      setValue('product.supportedRails', [...selectedRails, rail], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-normal tracking-[-0.025em] mb-3">Step 2/3: Product & Rails</h2>
        <p className="text-subtle text-base leading-relaxed max-w-3xl">
          Choose how you want to launch and how fiat moves. NordStern turns this into a live
          anchor — you never configure Stellar or SEP servers yourself.
        </p>
      </div>

      <div className="space-y-8">
        {/* Mode. Production renders alongside Test so founders see the path, but it is
            inert: not focusable, not clickable, and rejected by the schema. */}
        <div className="space-y-3">
          <Label>Launch Mode</Label>
          <div className="grid gap-3 md:grid-cols-2">
            {MODES.map((m) => {
              const detail = MODE_DETAIL[m.value];
              const isSelected = m.available && mode === m.value;

              if (!m.available) {
                return (
                  <div
                    key={m.value}
                    aria-disabled="true"
                    className="cursor-not-allowed select-none rounded-2xl border border-dashed border-line bg-surface p-4 opacity-60"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-subtle">{detail.icon}</span>
                      <h3 className="text-sm font-semibold text-ink">{m.label}</h3>
                      <span className="ml-auto rounded-pill bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-subtle">{detail.desc}</p>
                  </div>
                );
              }

              return (
                <motion.button
                  key={m.value}
                  type="button"
                  onClick={() => setValue('product.mode', m.value as 'test' | 'production', { shouldValidate: true })}
                  aria-pressed={isSelected}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    isSelected ? 'border-brand bg-brand-50/50 ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn(isSelected ? 'text-brand-700' : 'text-subtle')}>{detail.icon}</span>
                    <h3 className="text-sm font-semibold text-ink">{m.label}</h3>
                    {isSelected && (
                      <span className="ml-auto rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-subtle">{detail.desc}</p>
                </motion.button>
              );
            })}
          </div>
          <p className="text-sm text-subtle mt-2">Test Mode is available today. We&apos;ll let you know when Production opens up.</p>
          {errors.product?.mode && <p className="text-xs text-destructive">{errors.product.mode.message}</p>}
        </div>

        {/* Rails */}
        <div className="space-y-3 pt-6 border-t border-line">
          <Label>Payment Rails</Label>
          <div className="flex flex-wrap gap-2">
            {RAILS.map((rail) => (
              <OptionPill key={rail.value} option={rail} selected={selectedRails.includes(rail.value)} onToggle={toggleRail} />
            ))}
          </div>
          <p className="text-sm text-subtle mt-2 leading-relaxed max-w-3xl">
            How your customers move fiat in and out. Indian rails are live today; the rest follow as we expand.
            You&apos;ll add the payment-provider keys after approval — never on this page.
          </p>
          {errors.product?.supportedRails && <p className="text-xs text-destructive mt-1">{errors.product.supportedRails.message}</p>}
        </div>

        {/* Limits */}
        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Transaction Limits (per transfer)</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <label htmlFor="product.minTransactionBound" className="rounded-2xl border border-line bg-surface p-6 flex flex-col justify-center cursor-text transition-all focus-within:border-brand focus-within:ring-1 focus-within:ring-brand hover:border-brand/50">
              <span className="mb-3 text-xs font-semibold text-subtle uppercase tracking-wider">Minimum Limit</span>
              <div className="flex items-center gap-3">
               
                <input 
                  id="product.minTransactionBound" 
                  type="number" 
                  className="w-full bg-transparent text-4xl font-medium tracking-tight text-ink placeholder:text-line focus:outline-none" 
                  placeholder="0" 
                  {...register('product.minTransactionBound')} 
                />
              </div>
              {errors.product?.minTransactionBound && <p className="text-xs text-destructive mt-3">{errors.product.minTransactionBound.message}</p>}
            </label>

            <label htmlFor="product.maxTransactionBound" className="rounded-2xl border border-line bg-surface p-6 flex flex-col justify-center cursor-text transition-all focus-within:border-brand focus-within:ring-1 focus-within:ring-brand hover:border-brand/50">
              <span className="mb-3 text-xs font-semibold text-subtle uppercase tracking-wider">Maximum Limit</span>
              <div className="flex items-center gap-3">
                <input 
                  id="product.maxTransactionBound" 
                  type="number" 
                  className="w-full bg-transparent text-4xl font-medium tracking-tight text-ink placeholder:text-line focus:outline-none" 
                  placeholder="0" 
                  {...register('product.maxTransactionBound')} 
                />
              </div>
              {errors.product?.maxTransactionBound && <p className="text-xs text-destructive mt-3">{errors.product.maxTransactionBound.message}</p>}
            </label>
          </div>
          <p className="text-sm text-subtle mt-2 leading-relaxed max-w-3xl">Why we ask: these bound every deposit and withdrawal your anchor will accept. You can change them later.</p>
        </div>

        {/* Fees */}
        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Fee Structure</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {FEE_TYPES.map((type) => {
              const isSelected = feeType === type;
              let desc = '';
              if (type === 'Flat Fee Only') desc = 'Fixed amount per transaction';
              else if (type === 'Percentage Fee Only') desc = '% of transaction volume';
              else desc = 'Combine both fixed and % fees';

              return (
                <label
                  key={type}
                  className={cn(
                    'relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition-all h-full',
                    isSelected ? 'border-brand bg-brand-50/50 ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-ink leading-tight">{type}</span>
                    <input type="radio" value={type} {...register('product.feeArchitectureType')} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
                  </div>
                  <p className="text-xs text-subtle mt-auto">{desc}</p>
                </label>
              );
            })}
          </div>
          {errors.product?.feeArchitectureType && <p className="text-xs text-destructive">{errors.product.feeArchitectureType.message}</p>}

          <AnimatePresence initial={false}>
            {feeType && (
              <motion.div key="inputs" {...panelMotion} className="overflow-hidden">
                <div className={cn("mt-4 grid gap-4", feeType === 'Hybrid Fee (Flat + %)' ? "md:grid-cols-2" : "md:grid-cols-1")}>
                  {(feeType === 'Flat Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
                    <label htmlFor="product.flatFeeValue" className="rounded-2xl border border-line bg-surface p-6 flex flex-col justify-center cursor-text transition-all focus-within:border-brand focus-within:ring-1 focus-within:ring-brand hover:border-brand/50">
                      <span className="mb-3 text-xs font-semibold text-subtle uppercase tracking-wider">Flat Fee Amount</span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-medium text-subtle">{fiat}</span>
                        <input 
                          id="product.flatFeeValue" 
                          type="number" 
                          step="0.01" 
                          className="w-full bg-transparent text-4xl font-medium tracking-tight text-ink placeholder:text-line focus:outline-none" 
                          placeholder="0.00" 
                          {...register('product.flatFeeValue')} 
                        />
                      </div>
                      {errors.product?.flatFeeValue && <p className="text-xs text-destructive mt-3">{errors.product.flatFeeValue.message}</p>}
                    </label>
                  )}

                  {(feeType === 'Percentage Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
                    <label htmlFor="product.percentageFeeValue" className="rounded-2xl border border-line bg-surface p-6 flex flex-col justify-center cursor-text transition-all focus-within:border-brand focus-within:ring-1 focus-within:ring-brand hover:border-brand/50">
                      <span className="mb-3 text-xs font-semibold text-subtle uppercase tracking-wider">Percentage Fee</span>
                      <div className="flex items-center gap-2">
                        <input 
                          id="product.percentageFeeValue" 
                          type="number" 
                          step="0.01" 
                          className="w-full bg-transparent text-4xl font-medium tracking-tight text-ink placeholder:text-line focus:outline-none" 
                          placeholder="0.00" 
                          {...register('product.percentageFeeValue')} 
                        />
                        <span className="text-3xl font-light text-subtle">%</span>
                      </div>
                      {errors.product?.percentageFeeValue && <p className="text-xs text-destructive mt-3">{errors.product.percentageFeeValue.message}</p>}
                    </label>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Treasury & Integration Preferences */}
        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Treasury & Integration Preferences</Label>
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div>
              <Label htmlFor="_display.integrationType" className="mb-2 block text-sm font-medium text-ink">Preferred Integration Method</Label>
              <div className="relative">
                <select id="_display.integrationType" {...register('_display.integrationType')} className="flex h-12 w-full appearance-none rounded-2xl border border-line bg-surface px-4 pr-10 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">Select method...</option>
                  <option value="api">REST API</option>
                  <option value="sdk">Mobile/Web SDK</option>
                  <option value="dashboard">No-code Dashboard</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </div>
            <div>
              <Label htmlFor="_display.techStack" className="mb-2 block text-sm font-medium text-ink">Backend Technology Stack</Label>
              <Input id="_display.techStack" placeholder="e.g. Node.js, Python, Go" className="h-12 rounded-2xl bg-surface border-line px-4" {...register('_display.techStack')} />
            </div>
          </div>
          
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div>
              <Label htmlFor="_display.settlementSla" className="mb-2 block text-sm font-medium text-ink">Desired Settlement SLA</Label>
              <div className="relative">
                <select id="_display.settlementSla" {...register('_display.settlementSla')} className="flex h-12 w-full appearance-none rounded-2xl border border-line bg-surface px-4 pr-10 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">Select SLA...</option>
                  <option value="rtgs">Real-Time (RTGS / IMPS)</option>
                  <option value="t0">Same Day (T+0)</option>
                  <option value="t1">Standard (T+1)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </div>
            <div>
              <Label htmlFor="_display.kycTier" className="mb-2 block text-sm font-medium text-ink">Expected KYC Tier</Label>
              <div className="relative">
                <select id="_display.kycTier" {...register('_display.kycTier')} className="flex h-12 w-full appearance-none rounded-2xl border border-line bg-surface px-4 pr-10 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">Select KYC Level...</option>
                  <option value="l1">Basic (L1 - Min KYC)</option>
                  <option value="l2">Full (L2 - Video KYC)</option>
                  <option value="both">Both (Tiered)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 mt-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/50">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-brand"
              {...register('_display.autoSweep')}
            />
              <span className="text-base leading-relaxed text-subtle">
              <span className="font-semibold text-ink block mb-0.5">Enable Auto-Sweep</span>
              Automatically sweep daily fiat balance to your registered bank account at end-of-day.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-2xl p-5 flex gap-4 text-base shadow-sm">
        <Lightbulb className="h-6 w-6 text-brand shrink-0 mt-0.5" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Identity is on us.</span> Your customers verify once through NordStern&apos;s central KYC — you don&apos;t pick or integrate a KYC vendor.
        </p>
      </div>
    </div>
  );
}
