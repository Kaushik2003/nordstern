import { useFormContext } from 'react-hook-form';
import { OnboardingFormValues, isPublicEmail } from '@/lib/validations/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { Lightbulb } from 'lucide-react';

const MARKETS = ['India', 'United States', 'Brazil', 'Nigeria', 'European Union', 'Singapore', 'Mexico'];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Singapore', 'Brazil', 'Nigeria', 'Germany', 'Other'];
const FIAT = ['INR', 'USD', 'EUR', 'BRL', 'NGN', 'SGD'];

export function BusinessProfile() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormValues>();

  const selectedMarkets = watch('companyProfile.targetMarkets') || [];
  const businessEmail = watch('companyProfile.businessEmail') || '';

  const toggleMarket = (m: string) => {
    if (selectedMarkets.includes(m)) {
      setValue('companyProfile.targetMarkets', selectedMarkets.filter((c) => c !== m), { shouldValidate: true });
    } else {
      setValue('companyProfile.targetMarkets', [...selectedMarkets, m], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-2">Step 1/3: Business Profile</h2>
        <p className="text-subtle text-sm leading-relaxed">
          Tell us who you are. This is all we need to get you a sandbox anchor — no Stellar
          keys, no infrastructure, no compliance setup. NordStern handles all of that for you.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyProfile.legalEntityName">Business Name</Label>
            <Input id="companyProfile.legalEntityName" placeholder="e.g., MizuPay" {...register('companyProfile.legalEntityName')} />
            {errors.companyProfile?.legalEntityName && <p className="text-xs text-destructive mt-1">{errors.companyProfile.legalEntityName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyProfile.contactPerson">Contact Person</Label>
            <Input id="companyProfile.contactPerson" placeholder="e.g., Priya Sharma" {...register('companyProfile.contactPerson')} />
            {errors.companyProfile?.contactPerson && <p className="text-xs text-destructive mt-1">{errors.companyProfile.contactPerson.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyProfile.businessEmail">Email</Label>
            <Input id="companyProfile.businessEmail" type="email" placeholder="you@mizupay.io" {...register('companyProfile.businessEmail')} />
            <p className="text-xs text-subtle">Your invitation and operator sign-in will be tied to this address.</p>
            {businessEmail && isPublicEmail(businessEmail) && (
              <p className="text-xs text-amber-600 mt-1 font-medium">A corporate email fast-tracks production approval (a personal email is fine for Test Mode).</p>
            )}
            {errors.companyProfile?.businessEmail && <p className="text-xs text-destructive mt-1">{errors.companyProfile.businessEmail.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyProfile.corporateWebsiteUrl">Website <span className="text-subtle font-normal">(optional)</span></Label>
            <Input id="companyProfile.corporateWebsiteUrl" placeholder="https://mizupay.io" {...register('companyProfile.corporateWebsiteUrl')} />
            {errors.companyProfile?.corporateWebsiteUrl && <p className="text-xs text-destructive mt-1">{errors.companyProfile.corporateWebsiteUrl.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyProfile.country">Country</Label>
            <select
              id="companyProfile.country"
              {...register('companyProfile.country')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.companyProfile?.country && <p className="text-xs text-destructive mt-1">{errors.companyProfile.country.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyProfile.supportedFiat">Settlement Currency</Label>
            <select
              id="companyProfile.supportedFiat"
              {...register('companyProfile.supportedFiat')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select currency...</option>
              {FIAT.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-xs text-subtle">The fiat currency your customers deposit and withdraw.</p>
            {errors.companyProfile?.supportedFiat && <p className="text-xs text-destructive mt-1">{errors.companyProfile.supportedFiat.message}</p>}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label>Target Markets</Label>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((m) => {
              const isSelected = selectedMarkets.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMarket(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
                    isSelected ? 'bg-brand text-white border-brand' : 'bg-surface text-subtle border-line hover:border-brand/50'
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {errors.companyProfile?.targetMarkets && <p className="text-xs text-destructive mt-1">{errors.companyProfile.targetMarkets.message}</p>}
        </div>

        {/* Optional registration — never blocks Test Mode */}
        <div className="space-y-4 pt-6 border-t border-line">
          <div className="flex items-center justify-between">
            <Label>Business Registration <span className="text-subtle font-normal">(optional for Test Mode)</span></Label>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <select
                {...register('companyProfile.businessRegistrationStatus')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Registration status…</option>
                <option value="registered">Registered</option>
                <option value="in_progress">In progress</option>
                <option value="not_registered">Not yet registered</option>
              </select>
            </div>
            <div className="space-y-2">
              <Input placeholder="Company registration number" {...register('companyProfile.companyRegistrationNumber')} />
            </div>
          </div>
          <p className="text-xs text-subtle">Leave these blank to experiment in Test Mode. They&apos;re required only when you go to production.</p>
        </div>
      </div>

      <div className="mt-8 bg-surface border border-line rounded-xl p-4 flex gap-3 text-sm">
        <Lightbulb className="h-5 w-5 text-brand shrink-0" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">No paperwork to start.</span> Pick Test Mode on the next step and you can provision a full sandbox anchor in minutes, with no legal verification.
        </p>
      </div>
    </div>
  );
}
