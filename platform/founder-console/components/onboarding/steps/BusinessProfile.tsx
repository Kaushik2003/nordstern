'use client';

import { useFormContext } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingFormState } from '@/lib/validations/onboarding';
import { COUNTRIES, EXPANDING_SOON, FIAT, MARKETS, Option } from '@/lib/onboarding/availability';
import { COMPANY_SIZES, ENTITY_TYPES, INDUSTRIES, MONTHLY_VOLUMES } from '@/lib/onboarding/institution';
import { OptionPill } from '@/components/onboarding/OptionPill';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Label } from '@nordstern/shared-ui';
import { Input } from '@nordstern/shared-ui';
import { Lightbulb, Globe, ChevronDown } from 'lucide-react';

// Fields registered as `_display.*` are presentation-only: react-hook-form holds them
// so they survive step navigation, but they sit outside `onboardingSchema` and the
// register page whitelists the payload, so they never reach platform-api. See
// `DecorativeProfile` in lib/validations/onboarding.ts before making one of them real.

const FIELD_CLASS =
  'h-14 text-base rounded-2xl border-line px-5 focus-visible:ring-2 focus-visible:ring-brand';

const SELECT_CLASS =
  'flex h-14 w-full appearance-none rounded-2xl border border-input bg-background px-5 pr-12 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-brand';

const LABEL_CLASS = 'text-base font-semibold text-ink';

/** Native select whose unavailable options are visible but not selectable. */
function GatedSelect({
  id,
  options,
  placeholder,
  className,
  ...rest
}: { id: string; options: Option[]; placeholder: string; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select id={id} className={`${SELECT_CLASS} ${className ?? ''}`} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={!o.available}>
            {o.label}
            {o.available ? '' : ' — coming soon'}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
    </div>
  );
}

/** Select over a plain string list — every option selectable. */
function PlainSelect({
  id,
  options,
  placeholder,
  ...rest
}: { id?: string; options: string[]; placeholder: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select id={id} className={SELECT_CLASS} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
    </div>
  );
}

/** Field-level error that slides in rather than snapping the layout. */
function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1 text-sm text-destructive"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Field({
  htmlFor,
  label,
  optional,
  tooltip,
  error,
  children,
}: {
  htmlFor?: string;
  label: string;
  optional?: boolean;
  tooltip?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className={LABEL_CLASS}>
          {label}
          {optional && <span className="text-subtle font-normal"> (optional)</span>}
        </Label>
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

/** A titled block of related fields — the spine of the form's structure. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-10 border-t border-line pt-14 first:border-t-0 first:pt-0">
      <div className="space-y-3">
        <h3 className="text-2xl font-normal tracking-[-0.015em] text-ink">{title}</h3>
        <p className="text-base text-subtle leading-relaxed max-w-3xl">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function BusinessProfile() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OnboardingFormState>();

  const selectedMarkets = watch('companyProfile.targetMarkets') || [];

  const toggleMarket = (m: string) => {
    if (selectedMarkets.includes(m)) {
      setValue('companyProfile.targetMarkets', selectedMarkets.filter((c) => c !== m), { shouldValidate: true });
    } else {
      setValue('companyProfile.targetMarkets', [...selectedMarkets, m], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-14">
      <div>
        <h2 className="text-4xl font-normal tracking-[-0.025em] mb-4">Step 2/4: Business Profile</h2>
        <p className="text-subtle text-base leading-relaxed max-w-2xl">
          Tell us about your institution and who is registering on its behalf. This is all we need to
          get you a sandbox anchor — no Stellar keys, no infrastructure, no compliance setup.
          NordStern handles all of that for you.
        </p>
      </div>

      <div className="space-y-16">
        <Section
          title="The institution"
          description="The legal entity that will operate the anchor and hold the banking relationship."
        >
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="companyProfile.legalEntityName" label="Legal Entity Name" error={errors.companyProfile?.legalEntityName?.message}>
              <Input id="companyProfile.legalEntityName" placeholder="e.g., MizuPay Technologies Pvt Ltd" className={FIELD_CLASS} {...register('companyProfile.legalEntityName')} />
            </Field>
            <Field htmlFor="_display.entityType" label="Entity Type">
              <PlainSelect id="_display.entityType" options={ENTITY_TYPES} placeholder="Select entity type…" {...register('_display.entityType')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.industry" label="Industry">
              <PlainSelect id="_display.industry" options={INDUSTRIES} placeholder="Select industry…" {...register('_display.industry')} />
            </Field>
            <Field htmlFor="_display.companySize" label="Employees">
              <PlainSelect id="_display.companySize" options={COMPANY_SIZES} placeholder="Select headcount…" {...register('_display.companySize')} />
            </Field>
          </div>

          <Field htmlFor="companyProfile.corporateWebsiteUrl" label="Corporate Website" optional error={errors.companyProfile?.corporateWebsiteUrl?.message}>
            <Input id="companyProfile.corporateWebsiteUrl" placeholder="https://mizupay.io" className={FIELD_CLASS} {...register('companyProfile.corporateWebsiteUrl')} />
          </Field>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.yearOfIncorporation" label="Year of Incorporation" optional>
              <Input id="_display.yearOfIncorporation" placeholder="e.g., 2018" className={FIELD_CLASS} {...register('_display.yearOfIncorporation')} />
            </Field>
            <Field htmlFor="_display.lei" label="Legal Entity Identifier (LEI)" optional tooltip="The 20-character global LEI code, if applicable.">
              <Input id="_display.lei" placeholder="e.g., 5493006MHB84DD0ZWV18" className={FIELD_CLASS} {...register('_display.lei')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
             <Field htmlFor="_display.taxId" label="Tax ID / PAN" optional>
               <Input id="_display.taxId" placeholder="e.g., ABCDE1234F" className={FIELD_CLASS} {...register('_display.taxId')} />
             </Field>
             <Field htmlFor="_display.dba" label="Doing Business As (DBA)" optional tooltip="If you operate under a different brand name.">
               <Input id="_display.dba" placeholder="e.g., MizuPay" className={FIELD_CLASS} {...register('_display.dba')} />
             </Field>
          </div>
        </Section>

        <Section
          title="Operating footprint"
          description="Where the anchor operates and what it settles in. We're live in India today; other markets are on the roadmap."
        >
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="companyProfile.country" label="Country of Incorporation" error={errors.companyProfile?.country?.message}>
              <GatedSelect id="companyProfile.country" options={COUNTRIES} placeholder="Select country…" {...register('companyProfile.country')} />
            </Field>
            <Field
              htmlFor="companyProfile.supportedFiat"
              label="Settlement Currency"
              tooltip="The fiat currency your customers deposit and withdraw."
              error={errors.companyProfile?.supportedFiat?.message}
            >
              <GatedSelect id="companyProfile.supportedFiat" options={FIAT} placeholder="Select currency…" {...register('companyProfile.supportedFiat')} />
            </Field>
          </div>

          <div className="space-y-4">
            <Label className={LABEL_CLASS}>Target Markets</Label>
            <div className="flex flex-wrap items-start gap-3.5">
              {MARKETS.map((m) => (
                <OptionPill key={m.value} option={m} selected={selectedMarkets.includes(m.value)} onToggle={toggleMarket} />
              ))}
            </div>
            <p className="flex items-center gap-2 text-sm text-subtle">
              <Globe className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> {EXPANDING_SOON}
            </p>
            <FieldError message={errors.companyProfile?.targetMarkets?.message} />
          </div>

          <Field
            htmlFor="_display.expectedMonthlyVolume"
            label="Expected Monthly Volume"
            tooltip="An estimate is fine — it helps us size limits and treasury float. Nothing is committed."
          >
            <PlainSelect id="_display.expectedMonthlyVolume" options={MONTHLY_VOLUMES} placeholder="Select expected volume…" {...register('_display.expectedMonthlyVolume')} />
          </Field>
        </Section>

        <Section
          title="Registered address"
          description="The address on the institution's incorporation documents. Leave blank to experiment in Test Mode."
        >
          <Field htmlFor="_display.addressLine" label="Street Address" optional>
            <Input id="_display.addressLine" placeholder="Floor 4, 12 Residency Road" className={FIELD_CLASS} {...register('_display.addressLine')} />
          </Field>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.buildingName" label="Building Name / Suite" optional>
              <Input id="_display.buildingName" placeholder="e.g., Prestige Tech Park" className={FIELD_CLASS} {...register('_display.buildingName')} />
            </Field>
            <Field htmlFor="_display.landmark" label="Landmark" optional>
              <Input id="_display.landmark" placeholder="e.g., Near Silk Board Junction" className={FIELD_CLASS} {...register('_display.landmark')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-3">
            <Field htmlFor="_display.city" label="City" optional>
              <Input id="_display.city" placeholder="Bengaluru" className={FIELD_CLASS} {...register('_display.city')} />
            </Field>
            <Field htmlFor="_display.state" label="State" optional>
              <Input id="_display.state" placeholder="Karnataka" className={FIELD_CLASS} {...register('_display.state')} />
            </Field>
            <Field htmlFor="_display.postalCode" label="Postal Code" optional>
              <Input id="_display.postalCode" placeholder="560025" className={FIELD_CLASS} {...register('_display.postalCode')} />
            </Field>
          </div>
        </Section>

        {/* Optional registration — never blocks Test Mode */}
        <Section
          title="Business registration"
          description="An anchor that moves real money has to be traceable to a registered entity. Leave these blank to experiment in Test Mode — nothing here blocks you."
        >
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="companyProfile.businessRegistrationStatus" label="Registration Status" optional>
              <div className="relative">
                <select id="companyProfile.businessRegistrationStatus" {...register('companyProfile.businessRegistrationStatus')} className={SELECT_CLASS}>
                  <option value="">Registration status…</option>
                  <option value="registered">Registered</option>
                  <option value="in_progress">In progress</option>
                  <option value="not_registered">Not yet registered</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </Field>
            <Field htmlFor="companyProfile.companyRegistrationNumber" label="Registration Number" optional>
              <Input id="companyProfile.companyRegistrationNumber" placeholder="CIN / GSTIN" className={FIELD_CLASS} {...register('companyProfile.companyRegistrationNumber')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.registrationDocument" label="Primary Registration Document" optional>
               <div className="relative">
                <select id="_display.registrationDocument" {...register('_display.registrationDocument')} className={SELECT_CLASS}>
                  <option value="">Select document type…</option>
                  <option value="coi">Certificate of Incorporation</option>
                  <option value="partnership_deed">Partnership Deed</option>
                  <option value="llp_agreement">LLP Agreement</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </Field>
            <Field htmlFor="_display.issuingAuthority" label="Issuing Authority" optional>
              <Input id="_display.issuingAuthority" placeholder="e.g., Ministry of Corporate Affairs (MCA)" className={FIELD_CLASS} {...register('_display.issuingAuthority')} />
            </Field>
          </div>
        </Section>

        <Section
          title="Banking & Compliance Profile"
          description="High-level banking relationships and compliance standing to help tailor your onboarding and risk profile."
        >
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.primaryBank" label="Primary Banking Partner" optional>
              <Input id="_display.primaryBank" placeholder="e.g., HDFC Bank, ICICI Bank" className={FIELD_CLASS} {...register('_display.primaryBank')} />
            </Field>
            <Field htmlFor="_display.sourceOfFunds" label="Source of Funds" optional>
              <Input id="_display.sourceOfFunds" placeholder="e.g., Corporate Revenue, VC Funding" className={FIELD_CLASS} {...register('_display.sourceOfFunds')} />
            </Field>
          </div>
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.regulatoryLicenses" label="Regulatory Licenses Held" optional tooltip="Any existing licenses (e.g., NBFC, PPI, Money Transmitter).">
              <Input id="_display.regulatoryLicenses" placeholder="e.g., RBI PPI License..." className={FIELD_CLASS} {...register('_display.regulatoryLicenses')} />
            </Field>
            <Field htmlFor="_display.complianceOfficer" label="Compliance Officer Name" optional>
              <Input id="_display.complianceOfficer" placeholder="e.g., Sameer Desai" className={FIELD_CLASS} {...register('_display.complianceOfficer')} />
            </Field>
          </div>
        </Section>
      </div>

      <div className="mt-10 bg-surface border border-line rounded-2xl p-6 flex gap-4 text-base">
        <Lightbulb className="h-5 w-5 text-brand shrink-0 mt-0.5" />
        <p className="text-subtle leading-relaxed">
          <span className="font-semibold text-ink">No paperwork to start.</span> Test Mode is selected on the next step, and you can provision a full sandbox anchor in minutes with no legal verification.
        </p>
      </div>
    </div>
  );
}
