'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingFormState, isPublicEmail } from '@/lib/validations/onboarding';
import { DEPARTMENTS } from '@/lib/onboarding/institution';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Label, Input } from '@nordstern/shared-ui';
import { Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

const FIELD_CLASS =
  'h-14 text-base rounded-2xl border-line px-5 focus-visible:ring-2 focus-visible:ring-brand';

const SELECT_CLASS =
  'flex h-14 w-full appearance-none rounded-2xl border border-input bg-background px-5 pr-12 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-brand';

const LABEL_CLASS = 'text-base font-semibold text-ink';

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

export function FounderProfile({ onEmailTakenChange }: { onEmailTakenChange?: (taken: boolean) => void }) {
  const { register, watch, formState: { errors } } = useFormContext<OnboardingFormState>();

  const businessEmail = watch('companyProfile.businessEmail') || '';

  const [emailCheck, setEmailCheck] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  useEffect(() => {
    const email = businessEmail.trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) { setEmailCheck('idle'); onEmailTakenChange?.(false); return; }
    setEmailCheck('checking');
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/applications/email-available?email=${encodeURIComponent(email)}`, { signal: ctrl.signal });
        const j = await r.json();
        const taken = j.available === false;
        setEmailCheck(taken ? 'taken' : 'available');
        onEmailTakenChange?.(taken);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') { setEmailCheck('idle'); onEmailTakenChange?.(false); }
      }
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [businessEmail, onEmailTakenChange]);

  return (
    <div className="space-y-14">
      <div>
        <h2 className="text-4xl font-normal tracking-[-0.025em] mb-4">Step 1/4: Founder Profile</h2>
        <p className="text-subtle text-base leading-relaxed max-w-2xl">
          Tell us about yourself and your role at the institution. This is the primary contact
          we will use for onboarding, and who signs in to the operator console.
        </p>
      </div>

      <div className="space-y-16">
        <Section
          title="Authorized representative"
          description="The person registering on behalf of the institution."
        >
          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="companyProfile.contactPerson" label="Full Name" error={errors.companyProfile?.contactPerson?.message}>
              <Input id="companyProfile.contactPerson" placeholder="e.g., Priya Sharma" className={FIELD_CLASS} {...register('companyProfile.contactPerson')} />
            </Field>
            <Field htmlFor="_display.designation" label="Designation">
              <Input id="_display.designation" placeholder="e.g., Head of Treasury" className={FIELD_CLASS} {...register('_display.designation')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.department" label="Department">
              <PlainSelect id="_display.department" options={DEPARTMENTS} placeholder="Select department…" {...register('_display.department')} />
            </Field>
            <Field htmlFor="_display.workPhone" label="Work Phone" optional>
              <Input id="_display.workPhone" type="tel" placeholder="+91 98765 43210" className={FIELD_CLASS} {...register('_display.workPhone')} />
            </Field>
          </div>

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Field htmlFor="_display.linkedInProfile" label="LinkedIn Profile URL" optional>
              <Input id="_display.linkedInProfile" placeholder="https://linkedin.com/in/..." className={FIELD_CLASS} {...register('_display.linkedInProfile')} />
            </Field>
            <Field htmlFor="_display.nationality" label="Nationality" optional>
              <Input id="_display.nationality" placeholder="e.g., Indian" className={FIELD_CLASS} {...register('_display.nationality')} />
            </Field>
          </div>

          <Field
            htmlFor="companyProfile.businessEmail"
            label="Work Email"
            tooltip="Your invitation link and operator sign-in are both tied to this address."
            error={errors.companyProfile?.businessEmail?.message}
          >
              <Input id="companyProfile.businessEmail" type="email" placeholder="priya@mizupay.io" className={FIELD_CLASS} {...register('companyProfile.businessEmail')} />
              <AnimatePresence mode="wait">
                {emailCheck === 'checking' && (
                  <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…
                  </motion.p>
                )}
                {emailCheck === 'taken' && (
                  <motion.p key="taken" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-sm font-medium text-destructive">
                    This email is already registered as a founder. Use a different email or sign in to your existing console.
                  </motion.p>
                )}
                {emailCheck === 'available' && (
                  <motion.p key="available" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Email is available.
                  </motion.p>
                )}
              </AnimatePresence>
              {emailCheck !== 'taken' && businessEmail && isPublicEmail(businessEmail) && (
                <p className="text-sm text-warn mt-1 font-medium">A corporate email speeds up review (a personal email is fine for Test Mode).</p>
              )}
          </Field>

          <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-line bg-surface p-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-brand"
              {...register('_display.signingAuthority')}
            />
            <span className="text-base leading-relaxed text-subtle">
              <span className="font-semibold text-ink">I am authorized to register on behalf of this institution</span>{' '}
              and to enter into agreements binding it. We may ask for evidence of this authority before you go live.
            </span>
          </label>
        </Section>
      </div>
    </div>
  );
}
