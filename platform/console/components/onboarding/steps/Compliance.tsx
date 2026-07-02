import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { Lightbulb, FileText, CheckCircle, Clock } from 'lucide-react';

const SEP9_FIELDS = [
  { id: 'Basic Identity', fields: 'first_name, last_name, email_address' },
  { id: 'Document Verification', fields: 'birth_date, id_number, photo_id_front, photo_id_back' },
  { id: 'Advanced Biometrics', fields: 'selfie, proof_of_address, liveness_check' },
];

const REGULATORY_STATUSES = [
  {
    title: 'Fully Licensed',
    desc: 'Holds an active MSB, MTL, EMI, or equivalent domestic license.',
    icon: <CheckCircle className="h-5 w-5 text-brand" />
  },
  {
    title: 'Authorized Agent',
    desc: 'Operating under an umbrella agreement with a licensed sponsor bank.',
    icon: <FileText className="h-5 w-5 text-brand" />
  },
  {
    title: 'In-Progress',
    desc: 'Application submitted to regional regulators, pending final approval.',
    icon: <Clock className="h-5 w-5 text-brand" />
  }
];

export function Compliance() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();
  
  const selectedFields = watch('compliance.verificationFields') || [];
  const selectedStatus = watch('compliance.financialRegulatoryStatus');

  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setValue('compliance.verificationFields', selectedFields.filter(f => f !== fieldId), { shouldValidate: true });
    } else {
      setValue('compliance.verificationFields', [...selectedFields, fieldId], { shouldValidate: true });
    }
  };

  const setStatus = (statusTitle: string, statusDesc: string) => {
    setValue('compliance.financialRegulatoryStatus', `${statusTitle} - ${statusDesc}` as any, { shouldValidate: true });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 4/5: Regulatory & KYC Compliance</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Tell us about your legal standing and end-user verification mechanisms. Anchors must maintain compliance in all target jurisdictions.
        </p>
      </div>
      
      <div className="space-y-8">
        
        {/* Legal Boundary Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <div className="text-amber-900 leading-relaxed space-y-2">
            <p>
              <strong>TECHNOLOGY MIDDLEWARE AGREEMENT:</strong> NordStern is strictly a technology software-as-a-service (SaaS) and middleware provider. We do not provide financial licenses, AML/CFT screening, or dynamic regulatory compliance shielding. All legal obligations and liabilities reside 100% with the tenant entity.
            </p>
            <p className="text-amber-800/90 text-xs">
              <strong>Note on Sandbox vs. Mainnet:</strong> Configuring these compliance rules is required to complete this wizard, but formal verification is <em>not mandatory</em> to access the testnet sandbox. You can freely test integrations. However, NordStern provisions access to the Stellar Mainnet (real money rails) <strong>only after</strong> your regulatory standing is manually verified by our team.
            </p>
          </div>
        </div>
        
        {/* Regulatory Status Vertical Cards */}
        <div className="space-y-3">
          <Label>Financial Regulatory Status</Label>
          <div className="grid gap-3">
            {REGULATORY_STATUSES.map((status) => {
              const fullStatus = `${status.title} - ${status.desc}`;
              const isSelected = selectedStatus === fullStatus;
              
              return (
                <div 
                  key={status.title}
                  onClick={() => setStatus(status.title, status.desc)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                    isSelected 
                      ? "border-brand bg-brand-50/50 shadow-sm" 
                      : "border-line bg-surface hover:border-brand/50 hover:bg-surface-2"
                  )}
                >
                  <div className="mt-0.5">{status.icon}</div>
                  <div>
                    <h3 className={cn("font-semibold text-sm", isSelected ? "text-brand-800" : "text-ink")}>{status.title}</h3>
                    <p className="text-xs text-subtle mt-1 leading-relaxed">{status.desc}</p>
                  </div>
                  <div className="ml-auto flex items-center justify-center pt-1">
                    <div className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center",
                      isSelected ? "border-brand bg-brand" : "border-muted bg-canvas"
                    )}>
                      {isSelected && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.compliance?.financialRegulatoryStatus && <p className="text-xs text-destructive mt-1">{errors.compliance.financialRegulatoryStatus.message}</p>}
        </div>

        {/* KYC Provider */}
        <div className="space-y-2 pt-6 border-t border-line">
          <Label htmlFor="compliance.kycProvider">KYC / Identity Management Vendor</Label>
          <select 
            id="compliance.kycProvider"
            {...register('compliance.kycProvider')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select vendor...</option>
            <option value="Sumsub">Sumsub</option>
            <option value="Persona">Persona</option>
            <option value="Trulioo">Trulioo</option>
            <option value="Veriff">Veriff</option>
            <option value="In-House / Custom API">In-House / Custom API</option>
          </select>
          <p className="text-xs text-subtle">The third-party provider NordStern's middleware will orchestrate with to parse user identity data.</p>
          {errors.compliance?.kycProvider && <p className="text-xs text-destructive mt-1">{errors.compliance.kycProvider.message}</p>}
        </div>

        {/* SEP-9 Field Map */}
        <div className="space-y-4 pt-6 border-t border-line">
          <Label>Required SEP-9 Field Map (Stellar Compliance Standard)</Label>
          
          <div className="grid gap-3">
            {SEP9_FIELDS.map((item) => {
              const isSelected = selectedFields.includes(item.id);
              return (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl border border-line bg-surface hover:border-brand/50 hover:bg-surface-2 transition-all">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      id={`field-${item.id}`}
                      checked={isSelected}
                      onChange={() => toggleField(item.id)}
                      className="h-4 w-4 rounded-sm border-line text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`field-${item.id}`} className="font-semibold cursor-pointer text-sm text-ink block">
                      {item.id}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {item.fields.split(', ').map(f => (
                        <span key={f} className="text-[11px] font-mono font-medium text-subtle bg-canvas px-2 py-1 rounded-md border border-line">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-subtle mt-1">Select the structural data elements your compliance officer legally requires to clear an end-user under Stellar's SEP-12 KYC specifications.</p>
          {errors.compliance?.verificationFields && (
            <p className="text-xs text-destructive mt-1">{errors.compliance.verificationFields.message}</p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Quick Tip:</span> Don't worry if your live compliance vendor API endpoints aren't ready. NordStern includes a built-in sandbox mock identity provider so you can simulate KYC verification passes instantly.
        </p>
      </div>
    </div>
  );
}
