import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { Lightbulb } from 'lucide-react';

const AVAILABLE_RAILS = ['IMPS / UPI (India)', 'Pix (Brazil)', 'ACH / FedWire (US)', 'SEPA (Europe)', 'Mobile Money (Africa)', 'Local Bank Transfer (Generic)'];

export function PaymentRails() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();
  
  const selectedRails = watch('paymentRails.supportedRails') || [];
  const feeType = watch('paymentRails.feeArchitectureType');
  const targetAsset = watch('stellarConfig.targetAssetCode') || 'UNITS';

  const toggleRail = (rail: string) => {
    if (selectedRails.includes(rail)) {
      setValue('paymentRails.supportedRails', selectedRails.filter(r => r !== rail), { shouldValidate: true });
    } else {
      setValue('paymentRails.supportedRails', [...selectedRails, rail], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 3/5: Local Settlement Rails & Boundaries</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Configure how fiat moves off-chain. This structure instructs NordStern's API gateway how to calculate transaction boundaries and fee rates.
        </p>
      </div>
      
      <div className="space-y-8">
        <div className="space-y-3">
          <Label>Supported Regional Settlement Rails</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_RAILS.map((rail) => {
              const isSelected = selectedRails.includes(rail);
              return (
                <button
                  key={rail}
                  type="button"
                  onClick={() => toggleRail(rail)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    isSelected 
                      ? "bg-brand text-white border-brand" 
                      : "bg-surface text-subtle border-line hover:border-brand/50"
                  )}
                >
                  {rail}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-subtle mt-1">Select the banking architecture you use to accept and distribute local fiat currencies.</p>
          {errors.paymentRails?.supportedRails && (
            <p className="text-xs text-destructive mt-1">{errors.paymentRails.supportedRails.message}</p>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-line">
          <Label>Transaction Boundaries (Per Transfer)</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="relative">
                <Input id="paymentRails.minTransactionBound" type="number" placeholder="Minimum Amount" className="pr-12" {...register('paymentRails.minTransactionBound')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{targetAsset}</span>
              </div>
              {errors.paymentRails?.minTransactionBound && <p className="text-xs text-destructive mt-1">{errors.paymentRails.minTransactionBound.message}</p>}
            </div>
            <div>
              <div className="relative">
                <Input id="paymentRails.maxTransactionBound" type="number" placeholder="Maximum Amount" className="pr-12" {...register('paymentRails.maxTransactionBound')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{targetAsset}</span>
              </div>
              {errors.paymentRails?.maxTransactionBound && <p className="text-xs text-destructive mt-1">{errors.paymentRails.maxTransactionBound.message}</p>}
            </div>
          </div>
          <p className="text-xs text-subtle mt-1">The operational boundaries enforced per individual deposit or withdrawal order.</p>
        </div>

        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Fee Architecture Type</Label>
          <div className="flex flex-col gap-3">
            {['Flat Fee Only', 'Percentage Fee Only', 'Hybrid Fee (Flat + %)'].map(type => {
              const isSelected = feeType === type;
              return (
                <label key={type} className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                  isSelected ? "border-brand bg-brand-50/50 ring-1 ring-brand" : "border-line bg-surface hover:border-brand/50"
                )}>
                  <input 
                    type="radio" 
                    value={type} 
                    {...register('paymentRails.feeArchitectureType')}
                    className="h-4 w-4 text-brand focus:ring-brand accent-brand"
                  />
                  <span className="text-sm font-medium text-ink">{type}</span>
                </label>
              );
            })}
          </div>
          {errors.paymentRails?.feeArchitectureType && (
            <p className="text-xs text-destructive">{errors.paymentRails.feeArchitectureType.message}</p>
          )}

          {/* Dynamic Fee Inputs */}
          {(feeType === 'Flat Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-line">
              <Label htmlFor="paymentRails.flatFeeValue">Flat Fee Value</Label>
              <div className="relative mt-2">
                <Input id="paymentRails.flatFeeValue" type="number" step="0.01" className="bg-canvas pr-12" placeholder="e.g. 1.50" {...register('paymentRails.flatFeeValue')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle text-xs font-semibold">{targetAsset}</span>
              </div>
              {errors.paymentRails?.flatFeeValue && <p className="text-xs text-destructive mt-1">{errors.paymentRails.flatFeeValue.message}</p>}
            </div>
          )}

          {(feeType === 'Percentage Fee Only' || feeType === 'Hybrid Fee (Flat + %)') && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-line">
              <Label htmlFor="paymentRails.percentageFeeValue">Percentage Fee Value (%)</Label>
              <Input id="paymentRails.percentageFeeValue" type="number" step="0.01" className="mt-2 bg-canvas" placeholder="e.g. 2.5" {...register('paymentRails.percentageFeeValue')} />
              {errors.paymentRails?.percentageFeeValue && <p className="text-xs text-destructive mt-1">{errors.paymentRails.percentageFeeValue.message}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Quick Tip:</span> NordStern uses these configurations to dynamically feed the Stellar Anchor Platform's SEP-38 (Quotes/RFQ) service. Ensure your fee numbers match your real banking overhead to prevent settlement discrepancies.
        </p>
      </div>
    </div>
  );
}
