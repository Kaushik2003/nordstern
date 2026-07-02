import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

// Generates a mock 32-byte hex secure token
const generateToken = () => [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

interface ReviewSubmitProps {
  onEditStep?: (stepId: number) => void;
}

export function ReviewSubmit({ onEditStep }: ReviewSubmitProps) {
  const { register, getValues, setValue, watch, formState: { errors } } = useFormContext<OnboardingFormValues>();
  const values = getValues();
  
  const [showToken, setShowToken] = useState(false);
  const token = watch('reviewSubmit.webhookSigningToken');

  // Auto-generate token on mount if missing
  useEffect(() => {
    if (!token) {
      setValue('reviewSubmit.webhookSigningToken', generateToken(), { shouldValidate: true });
    }
  }, [token, setValue]);

  const handleRegenerate = () => {
    setValue('reviewSubmit.webhookSigningToken', generateToken(), { shouldValidate: true });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(token || '');
    // In a real app, add a toast here
  };

  const SectionHeader = ({ title, step }: { title: string, step: number }) => (
    <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
      <h3 className="font-semibold text-sm text-brand">{title}</h3>
      {onEditStep && (
        <button type="button" onClick={() => onEditStep(step)} className="text-xs font-medium text-subtle hover:text-brand transition-colors">
          [Edit]
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 5/5: Technical Hooks & Final Review</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Provide your server's backend integration callback endpoints and review your compiled tenant infrastructure payload before submission.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reviewSubmit.tenantServerUrl">Tenant Business Server Base URL</Label>
          <Input id="reviewSubmit.tenantServerUrl" placeholder="https://api.yourcompany.com/nordstern-webhook" {...register('reviewSubmit.tenantServerUrl')} />
          <p className="text-xs text-subtle">The secure, live API endpoint hosted on your servers where NordStern will dispatch real-time webhooks (e.g., notifying your bank ledger when an on-chain transaction is cleared).</p>
          {errors.reviewSubmit?.tenantServerUrl && <p className="text-xs text-destructive mt-1">{errors.reviewSubmit.tenantServerUrl.message}</p>}
        </div>

        <div className="space-y-2 pt-4 border-t border-line">
          <Label>Webhook Security Signing Token</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input 
                type={showToken ? "text" : "password"} 
                readOnly 
                value={token || ''}
                className="pr-10 font-mono text-sm bg-surface"
              />
              <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={copyToClipboard} className="shrink-0" title="Copy to Clipboard">
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={handleRegenerate} className="shrink-0" title="Regenerate Token">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-subtle">The unique security secret used to authenticate that incoming transaction payloads originated from NordStern.</p>
        </div>
      </div>
      
      <div className="space-y-4 pt-8">
        <h3 className="font-bold text-lg text-ink">Summary Review Ledger</h3>
        
        {/* Profile */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="1. Corporate Profile" step={1} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div>
              <p className="text-subtle text-xs mb-1">Legal Entity</p>
              <p className="font-medium text-ink">{values.companyProfile?.legalEntityName || '—'}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">Country</p>
              <p className="font-medium text-ink">{values.companyProfile?.countryOfIncorporation || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-subtle text-xs mb-1">Corridors</p>
              <p className="font-medium text-ink">{values.companyProfile?.targetCorridors?.join(', ') || '—'}</p>
            </div>
          </div>
        </div>

        {/* Stellar Config */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="2. Stellar Asset" step={2} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div>
              <p className="text-subtle text-xs mb-1">Asset Code</p>
              <p className="font-medium text-ink">{values.stellarConfig?.targetAssetCode || '—'}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">Asset Type</p>
              <p className="font-medium text-ink">{values.stellarConfig?.assetType || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-subtle text-xs mb-1">Issuer Public Key</p>
              <p className="font-medium text-ink font-mono text-xs truncate" title={values.stellarConfig?.issuerPublicKey}>
                {values.stellarConfig?.issuerPublicKey || '—'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-subtle text-xs mb-1">Distribution Public Key</p>
              <p className="font-medium text-ink font-mono text-xs truncate" title={values.stellarConfig?.distributionPublicKey}>
                {values.stellarConfig?.distributionPublicKey || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Rails */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="3. Settlement Rails" step={3} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div className="col-span-2">
              <p className="text-subtle text-xs mb-1">Supported Rails</p>
              <p className="font-medium text-ink">{values.paymentRails?.supportedRails?.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">Boundaries</p>
              <p className="font-medium text-ink">Min: {values.paymentRails?.minTransactionBound || 0} | Max: {values.paymentRails?.maxTransactionBound || 0}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">Fee Structure</p>
              <p className="font-medium text-ink">{values.paymentRails?.feeArchitectureType || '—'}</p>
            </div>
          </div>
        </div>
        
        {/* Compliance */}
        <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
          <SectionHeader title="4. Compliance & KYC" step={4} />
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div className="col-span-2">
              <p className="text-subtle text-xs mb-1">Regulatory Status</p>
              <p className="font-medium text-ink text-xs">{values.compliance?.financialRegulatoryStatus || '—'}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">Vendor</p>
              <p className="font-medium text-ink">{values.compliance?.kycProvider || '—'}</p>
            </div>
            <div>
              <p className="text-subtle text-xs mb-1">SEP-9 Fields</p>
              <p className="font-medium text-ink text-xs">{values.compliance?.verificationFields?.join(', ') || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Quick Tip:</span> On submission, our platform will generate a sandboxed multi-tenant partition. You can run end-to-end sandbox operations instantly while your compliance status is reviewed.
        </p>
      </div>
    </div>
  );
}
