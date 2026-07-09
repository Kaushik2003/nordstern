import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { FlaskConical, Rocket, Lightbulb } from 'lucide-react';

const AVAILABLE_RAILS = ['UPI (India)', 'IMPS / Bank Transfer (India)', 'Pix (Brazil)', 'ACH / FedWire (US)', 'SEPA (Europe)', 'Mobile Money (Africa)'];

const MODES = [
  {
    id: 'test' as const,
    title: 'Test Mode',
    desc: 'Provision a full sandbox anchor on Stellar testnet. No legal verification, no real money. Start in minutes.',
    icon: <FlaskConical className="h-5 w-5" />,
  },
  {
    id: 'production' as const,
    title: 'Production',
    desc: 'Real money on Stellar mainnet. Requires business registration and manual review before we provision.',
    icon: <Rocket className="h-5 w-5" />,
  },
];

export function ProductRails() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();

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
        <h2 className="text-3xl font-bold mb-2">Step 2/3: Product & Rails</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Choose how you want to launch and how fiat moves. NordStern turns this into a live
          anchor — you never configure Stellar or SEP servers yourself.
        </p>
      </div>

      <div className="space-y-8">
        {/* Mode */}
        <div className="space-y-3">
          <Label>Launch Mode</Label>
          <div className="grid gap-3 md:grid-cols-2">
            {MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setValue('product.mode', m.id, { shouldValidate: true })}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all',
                    isSelected ? 'border-brand bg-brand-50/50 ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(isSelected ? 'text-brand' : 'text-subtle')}>{m.icon}</span>
                    <h3 className="font-semibold text-sm text-ink">{m.title}</h3>
                  </div>
                  <p className="text-xs text-subtle leading-relaxed">{m.desc}</p>
                </div>
              );
            })}
          </div>
          {mode === 'production' && (
            <p className="text-xs text-amber-600 font-medium">
              Production is a gated, counsel-reviewed path. Your application is accepted, but provisioning waits until your regulatory standing is verified.
            </p>
          )}
        </div>

        {/* Rails */}
        <div className="space-y-3 pt-6 border-t border-line">
          <Label>Payment Rails</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_RAILS.map((rail) => {
              const isSelected = selectedRails.includes(rail);
              return (
                <button
                  key={rail}
                  type="button"
                  onClick={() => toggleRail(rail)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
                    isSelected ? 'bg-brand text-white border-brand' : 'bg-surface text-subtle border-line hover:border-brand/50'
                  )}
                >
                  {rail}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-subtle mt-1">How your customers move fiat in and out. You&apos;ll add the payment-provider keys after approval.</p>
          {errors.product?.supportedRails && <p className="text-xs text-destructive mt-1">{errors.product.supportedRails.message}</p>}
        </div>

        {/* Limits */}
        <div className="space-y-3 pt-6 border-t border-line">
          <Label>Transaction Limits (per transfer)</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="relative">
                <Input type="number" placeholder="Minimum" className="pr-14" {...register('product.minTransactionBound')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{fiat}</span>
              </div>
              {errors.product?.minTransactionBound && <p className="text-xs text-destructive mt-1">{errors.product.minTransactionBound.message}</p>}
            </div>
            <div>
              <div className="relative">
                <Input type="number" placeholder="Maximum" className="pr-14" {...register('product.maxTransactionBound')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{fiat}</span>
              </div>
              {errors.product?.maxTransactionBound && <p className="text-xs text-destructive mt-1">{errors.product.maxTransactionBound.message}</p>}
            </div>
          </div>
        </div>

        {/* Fees */}
        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Fee Structure</Label>
          <div className="flex flex-col gap-3">
            {['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'].map((type) => {
              const isSelected = feeType === type;
              return (
                <label
                  key={type}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3',
                    isSelected ? 'border-brand bg-brand-50/50 ring-1 ring-brand' : 'border-line bg-surface hover:border-brand/50'
                  )}
                >
                  <input type="radio" value={type} {...register('product.feeArchitectureType')} className="h-4 w-4 accent-brand" />
                  <span className="text-sm font-medium text-ink">{type}</span>
                </label>
              );
            })}
          </div>
          {errors.product?.feeArchitectureType && <p className="text-xs text-destructive">{errors.product.feeArchitectureType.message}</p>}

          {(feeType === 'Flat Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-line">
              <Label htmlFor="product.flatFeeValue">Flat Fee</Label>
              <div className="relative mt-2">
                <Input id="product.flatFeeValue" type="number" step="0.01" className="bg-canvas pr-14" placeholder="e.g. 1.50" {...register('product.flatFeeValue')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{fiat}</span>
              </div>
              {errors.product?.flatFeeValue && <p className="text-xs text-destructive mt-1">{errors.product.flatFeeValue.message}</p>}
            </div>
          )}

          {(feeType === 'Percentage Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-line">
              <Label htmlFor="product.percentageFeeValue">Percentage Fee (%)</Label>
              <Input id="product.percentageFeeValue" type="number" step="0.01" className="mt-2 bg-canvas" placeholder="e.g. 2.5" {...register('product.percentageFeeValue')} />
              {errors.product?.percentageFeeValue && <p className="text-xs text-destructive mt-1">{errors.product.percentageFeeValue.message}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Identity is on us.</span> Your customers verify once through NordStern&apos;s central KYC — you don&apos;t pick or integrate a KYC vendor.
        </p>
      </div>
    </div>
  );
}
