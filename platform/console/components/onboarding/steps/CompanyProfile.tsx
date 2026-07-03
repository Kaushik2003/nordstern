import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { Lightbulb } from 'lucide-react';

const CORRIDORS = ['India', 'United States', 'Brazil', 'Nigeria', 'European Union', 'Singapore', 'Mexico'];
const COUNTRIES = ['United States', 'India', 'United Kingdom', 'Singapore', 'Brazil', 'Nigeria', 'Germany', 'Other'];

export function CompanyProfile() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();

  const selectedCorridors = watch('companyProfile.targetCorridors') || [];
  const businessEmail = watch('companyProfile.businessEmail') || '';
  const isGenericEmail = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'protonmail.com'].some(domain => businessEmail.toLowerCase().endsWith(`@${domain}`));

  const toggleCorridor = (corridor: string) => {
    if (selectedCorridors.includes(corridor)) {
      setValue('companyProfile.targetCorridors', selectedCorridors.filter(c => c !== corridor), { shouldValidate: true });
    } else {
      setValue('companyProfile.targetCorridors', [...selectedCorridors, corridor], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 1/5: Corporate Profile</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Tell us about your organization. NordStern enforces strict business verification to safeguard our multi-tenant infrastructure rails.
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Row 1 */}
        <div className="space-y-2">
          <Label htmlFor="companyProfile.legalEntityName">Legal Entity Name</Label>
          <Input id="companyProfile.legalEntityName" placeholder="e.g., Nexus Pay Private Limited" {...register('companyProfile.legalEntityName')} />
          <p className="text-xs text-subtle">The official registered name of your business entity as it appears on regulatory filings.</p>
          {errors.companyProfile?.legalEntityName && <p className="text-xs text-destructive mt-1">{errors.companyProfile.legalEntityName.message}</p>}
        </div>

        {/* Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyProfile.corporateWebsiteUrl">Corporate Website</Label>
            <Input id="companyProfile.corporateWebsiteUrl" placeholder="https://nexuspay.io" {...register('companyProfile.corporateWebsiteUrl')} />
            <p className="text-xs text-subtle">Your public-facing company website.</p>
            {errors.companyProfile?.corporateWebsiteUrl && <p className="text-xs text-destructive mt-1">{errors.companyProfile.corporateWebsiteUrl.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyProfile.businessEmail">Business Email Address</Label>
            <Input id="companyProfile.businessEmail" type="email" placeholder="compliance@nexuspay.io" {...register('companyProfile.businessEmail')} />
            <p className="text-xs text-subtle mt-1">All automated onboarding notifications and operational keys will be tied to this address.</p>
            {isGenericEmail && (
              <p className="text-xs text-amber-600 mt-1 font-medium">Note: It is not recommended to provide a generic or consumer email (like @gmail.com). A corporate domain fast-tracks approval.</p>
            )}
            {errors.companyProfile?.businessEmail && <p className="text-xs text-destructive mt-1">{errors.companyProfile.businessEmail.message}</p>}
          </div>
        </div>

        {/* Row 3 */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="companyProfile.countryOfIncorporation">Jurisdiction of Incorporation</Label>
          <select 
            id="companyProfile.countryOfIncorporation"
            {...register('companyProfile.countryOfIncorporation')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select country...</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="text-xs text-subtle">The physical country or state where your entity holds its primary business registry.</p>
          {errors.companyProfile?.countryOfIncorporation && <p className="text-xs text-destructive mt-1">{errors.companyProfile.countryOfIncorporation.message}</p>}
        </div>

        {/* Row 4 */}
        <div className="space-y-3 pt-2">
          <Label>Primary Target Corridors / Markets</Label>
          <div className="flex flex-wrap gap-2">
            {CORRIDORS.map((corridor) => {
              const isSelected = selectedCorridors.includes(corridor);
              return (
                <button
                  key={corridor}
                  type="button"
                  onClick={() => toggleCorridor(corridor)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                    isSelected 
                      ? "bg-brand text-white border-brand" 
                      : "bg-surface text-subtle border-line hover:border-brand/50"
                  )}
                >
                  {corridor}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-subtle mt-1">Select the geographic regions where you plan to launch payment rails or issue local fiat anchors.</p>
          {errors.companyProfile?.targetCorridors && (
            <p className="text-xs text-destructive mt-1">{errors.companyProfile.targetCorridors.message}</p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">Quick Tip:</span> To fast-track your access approval, ensure your corporate website is live and your business email matches the domain perfectly. Applications with mismatched domains are routed to manual review.
        </p>
      </div>
    </div>
  );
}
