'use client';

import { useFormContext } from 'react-hook-form';
import { OnboardingFormState } from '@/lib/validations/onboarding';
import { Lightbulb, Pencil } from 'lucide-react';

interface ReviewSubmitProps {
  onEditStep?: (stepId: number) => void;
}

export function ReviewSubmit({ onEditStep }: ReviewSubmitProps) {
  const { getValues } = useFormContext<OnboardingFormState>();
  const values = getValues();
  const p = values.companyProfile;
  const pr = values.product;
  const d = values._display;

  const SectionHeader = ({ title, step }: { title: string; step: number }) => (
    <div className="flex items-center justify-between border-b border-line pb-3 mb-2">
      <h3 className="font-semibold text-base text-ink">{title}</h3>
      {onEditStep && (
        <button
          type="button"
          onClick={() => onEditStep(step)}
          className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium text-brand-700 transition-colors bg-brand-50 hover:bg-brand-100"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      )}
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | boolean }) => (
    <div>
      <p className="text-subtle text-sm mb-1.5 font-medium">{label}</p>
      <p className="font-medium text-ink text-base">{value || '—'}</p>
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

  const integrationLabel = d?.integrationType === 'api' ? 'REST API' : d?.integrationType === 'sdk' ? 'Mobile/Web SDK' : d?.integrationType === 'dashboard' ? 'No-code Dashboard' : d?.integrationType;
  const kycLabel = d?.kycTier === 'l1' ? 'Basic L1' : d?.kycTier === 'l2' ? 'Full Video L2' : d?.kycTier === 'both' ? 'Tiered (Both)' : d?.kycTier;
  const slaLabel = d?.settlementSla === 'rtgs' ? 'Real-Time' : d?.settlementSla === 't0' ? 'Same Day (T+0)' : d?.settlementSla === 't1' ? 'Standard (T+1)' : d?.settlementSla;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-normal tracking-[-0.025em] mb-3">Step 4/4: Review & Submit</h2>
        <p className="text-subtle text-base leading-relaxed max-w-3xl">
          Review your complete institutional profile. On submission, we manually vet your application. Once approved, you&apos;ll receive a secure, one-time invitation to configure your payment-provider keys and provision your sandbox.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <SectionHeader title="Institution Profile" step={2} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-5">
            <Field label="Legal Entity Name" value={p?.legalEntityName} />
            <Field label="Doing Business As" value={d?.dba} />
            <Field label="Entity Type" value={d?.entityType} />
            <Field label="Industry" value={d?.industry} />
            <Field label="Year of Incorporation" value={d?.yearOfIncorporation} />
            <Field label="Tax ID / PAN" value={d?.taxId} />
            <Field label="LEI" value={d?.lei} />
            <Field label="Corporate Website" value={p?.corporateWebsiteUrl} />
            <Field label="Employees" value={d?.companySize} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <SectionHeader title="Authorized Representative" step={1} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-5">
            <Field label="Full Name" value={p?.contactPerson} />
            <Field label="Designation" value={d?.designation} />
            <Field label="Department" value={d?.department} />
            <Field label="Work Email" value={p?.businessEmail} />
            <Field label="Work Phone" value={d?.workPhone} />
            <Field label="LinkedIn Profile" value={d?.linkedInProfile} />
            <div className="col-span-full">
              <Field label="Signing Authority" value={d?.signingAuthority ? 'Yes, authorized to bind institution' : '—'} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <SectionHeader title="Banking & Compliance" step={2} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-5">
            <Field label="Primary Bank" value={d?.primaryBank} />
            <Field label="Source of Funds" value={d?.sourceOfFunds} />
            <Field label="Regulatory Licenses" value={d?.regulatoryLicenses} />
            <Field label="Compliance Officer" value={d?.complianceOfficer} />
            <Field label="Registration Status" value={p?.businessRegistrationStatus} />
            <Field label="Registration Number" value={p?.companyRegistrationNumber} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <SectionHeader title="Product Setup & Rails" step={3} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-5">
            <Field label="Launch Mode" value={pr?.mode === 'test' ? 'Test Mode (Sandbox)' : 'Production'} />
            <Field label="Settlement Currency" value={p?.supportedFiat} />
            <Field label="Target Markets" value={p?.targetMarkets?.join(', ')} />
            <div className="col-span-full border-t border-line pt-5 mt-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <Field label="Fee Architecture" value={fee} />
                <Field label="Transaction Bounds" value={`${pr?.minTransactionBound || 0} – ${pr?.maxTransactionBound || 0} ${p?.supportedFiat ?? ''}`} />
                <Field label="Payment Rails" value={pr?.supportedRails?.join(', ')} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <SectionHeader title="Integration & Treasury" step={3} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mt-5">
            <Field label="Integration Method" value={integrationLabel} />
            <Field label="Tech Stack" value={d?.techStack} />
            <Field label="Expected KYC Tier" value={kycLabel} />
            <Field label="Settlement SLA" value={slaLabel} />
            <Field label="Auto-Sweep" value={d?.autoSweep ? 'Enabled' : 'Disabled'} />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-2xl p-5 flex gap-4 text-base shadow-sm">
        <Lightbulb className="h-6 w-6 text-brand shrink-0 mt-0.5" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">What happens next:</span> We will review your application and email a secure, one-time invitation link. That&apos;s where you&apos;ll enter your live payment-provider keys and branding — never on this public application page.
        </p>
      </div>
    </div>
  );
}
