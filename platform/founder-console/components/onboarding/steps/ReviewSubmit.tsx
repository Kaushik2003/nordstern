import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Lightbulb } from 'lucide-react';

interface ReviewSubmitProps {
  onEditStep?: (stepId: number) => void;
}

export function ReviewSubmit({ onEditStep }: ReviewSubmitProps) {
  const { getValues } = useFormContext<OnboardingFormValues>();
  const values = getValues();
  const p = values.companyProfile;
  const pr = values.product;

  const SectionHeader = ({ title, step }: { title: string; step: number }) => (
    <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
      <h3 className="font-semibold text-sm text-brand">{title}</h3>
      {onEditStep && (
        <button type="button" onClick={() => onEditStep(step)} className="text-xs font-medium text-subtle hover:text-brand transition-colors">
          [Edit]
        </button>
      )}
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-subtle text-xs mb-1">{label}</p>
      <p className="font-medium text-ink text-sm">{value || '—'}</p>
    </div>
  );

  const fee =
    pr?.feeArchitectureType === 'Flat Fee Only'
      ? `Flat ${pr?.flatFeeValue ?? '—'} ${p?.supportedFiat ?? ''}`
      : pr?.feeArchitectureType === 'Percentage Fee Only'
        ? `${pr?.percentageFeeValue ?? '—'}%`
        : pr?.feeArchitectureType === 'Hybrid Fee (Flat + %)'
          ? `Flat ${pr?.flatFeeValue ?? '—'} ${p?.supportedFiat ?? ''} + ${pr?.percentageFeeValue ?? '—'}%`
          : '—';

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 3/3: Review & Submit</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Confirm your details. On submission we vet the application; once approved you&apos;ll get a
          one-time invitation to add your payment-provider keys and branding, then we provision your anchor.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="1. Business Profile" step={1} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <Field label="Business" value={p?.legalEntityName} />
            <Field label="Contact" value={p?.contactPerson} />
            <Field label="Email" value={p?.businessEmail} />
            <Field label="Country" value={p?.country} />
            <Field label="Settlement Currency" value={p?.supportedFiat} />
            <Field label="Registration" value={p?.businessRegistrationStatus} />
            <div className="col-span-2">
              <Field label="Target Markets" value={p?.targetMarkets?.join(', ')} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="2. Product & Rails" step={2} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
            <Field label="Mode" value={pr?.mode === 'production' ? 'Production (gated)' : 'Test Mode'} />
            <Field label="Asset" value={pr?.assetType === 'custom' ? `${(pr?.assetCode || '').toUpperCase()}${pr?.assetName ? ` (${pr.assetName})` : ''}` : (pr?.assetType ?? '—')} />
            <Field label="Limits" value={`${pr?.minTransactionBound || 0} – ${pr?.maxTransactionBound || 0} ${p?.supportedFiat ?? ''}`} />
            <Field label="Fees" value={fee} />
            <div className="col-span-2">
              <Field label="Payment Rails" value={pr?.supportedRails?.join(', ')} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">What happens next:</span> we review your application and email a secure, one-time invitation link. That&apos;s where you&apos;ll enter your Razorpay/Cashfree keys and brand — never here.
        </p>
      </div>
    </div>
  );
}
