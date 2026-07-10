'use client';

import { useState } from 'react';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { onboardingSchema, OnboardingFormState } from '@/lib/validations/onboarding';
import { LIVE_COUNTRY, LIVE_FIAT } from '@/lib/onboarding/availability';
import { SidebarSteps } from '@/components/onboarding/SidebarSteps';
import { StepProgress } from '@/components/onboarding/StepProgress';
import { TrustStrip } from '@/components/onboarding/TrustStrip';
import { ConfirmSubmitModal } from '@/components/onboarding/ConfirmSubmitModal';
import { BusinessProfile } from '@/components/onboarding/steps/BusinessProfile';
import { ProductRails } from '@/components/onboarding/steps/ProductRails';
import { ReviewSubmit } from '@/components/onboarding/steps/ReviewSubmit';
import { Button } from '@nordstern/shared-ui';
import { ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Set by BusinessProfile's live check — blocks advancing past step 1 with a taken email.
  const [emailTaken, setEmailTaken] = useState(false);
  const reduceMotion = useReducedMotion();

  // `_display.*` fields are presentation-only and live outside `onboardingSchema`,
  // so the resolver never sees them — hence the cast. See `DecorativeProfile`.
  const methods = useForm<OnboardingFormState>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingFormState>,
    mode: 'onTouched',
    defaultValues: {
      companyProfile: {
        country: LIVE_COUNTRY,
        targetMarkets: [LIVE_COUNTRY],
        supportedFiat: LIVE_FIAT,
      },
      product: {
        mode: 'test',
        supportedRails: [],
      },
    },
  });

  const { trigger, handleSubmit, getValues, formState: { isSubmitting } } = methods;

  const validateAndProceed = async () => {
    let fieldsToValidate: string[] = [];

    switch (currentStep) {
      case 1: fieldsToValidate = ['companyProfile']; break;
      case 2: fieldsToValidate = ['product']; break;
    }

    const isValid = await trigger(fieldsToValidate as any);

    // Don't let the founder proceed past step 1 with an email that's already in use.
    if (currentStep === 1 && emailTaken) return;

    if (isValid && currentStep < 3) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep > furthestStep) setFurthestStep(nextStep);
    }
  };

  // Step 3's button opens the confirmation dialog rather than submitting directly.
  // The dialog is the only path into `onSubmit`.
  const openConfirm = async () => {
    setSubmitError(null);
    if (await trigger()) setConfirmOpen(true);
  };

  const onSubmit = async (data: OnboardingFormState) => {
    try {
      // Whitelist what goes on the wire. zod already strips `_display`, but naming the
      // two real sections means a future schema edit can't quietly widen the payload.
      const payload = { companyProfile: data.companyProfile, product: data.product };
      const res = await fetch('/api/v1/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error || 'Submission failed');
      }
      setConfirmOpen(false);
      setIsSubmitted(true);
    } catch (error) {
      setConfirmOpen(false);
      setSubmitError(error instanceof Error ? error.message : 'Submission failed. Please try again.');
    }
  };

  const handleStepClick = (step: number) => {
    // Only allow navigating to a step if we've already reached it
    if (step <= furthestStep) {
      setCurrentStep(step);
    }
  };

  const confirmSummary = () => {
    const v = getValues();
    return [
      { label: 'Business', value: v.companyProfile?.legalEntityName || '—' },
      { label: 'Contact email', value: v.companyProfile?.businessEmail || '—' },
      { label: 'Country', value: v.companyProfile?.country || '—' },
      { label: 'Launch mode', value: v.product?.mode === 'test' ? 'Test Mode (sandbox)' : '—' },
      { label: 'Payment rails', value: v.product?.supportedRails?.join(', ') || '—' },
    ];
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas w-full h-screen">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
          className="max-w-md w-full text-center p-12 border border-line shadow-sm rounded-2xl bg-canvas"
        >
          <div className="flex justify-center mb-8">
            <motion.div
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
            >
              <CheckCircle2 className="h-20 w-20 text-brand" />
            </motion.div>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-ink">Application submitted</h2>
          <p className="text-base text-subtle mb-10 leading-relaxed">
            A person on our team reviews every application. We&apos;ll email your primary contact with a
            one-time invitation link once yours is approved — usually within two business days.
          </p>
          <Button asChild className="w-full bg-brand text-white hover:bg-brand-600 rounded-lg h-12 text-base font-medium">
            <Link href="/login">Return to login</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <SidebarSteps
        currentStep={currentStep}
        furthestStep={furthestStep}
        onStepClick={handleStepClick}
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-canvas relative">

        <div className="w-full max-w-5xl mx-auto px-8 py-16 lg:px-14 flex flex-col min-h-full">

          {/* Form Container */}
          <div className="flex-1 flex flex-col">
            <FormProvider {...methods}>
              {/* Submission is driven explicitly by the confirmation dialog — a stray
                  Enter keypress inside a field must not bypass it. */}
              <form onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col">

                {/* Step Content Rendering. react-hook-form keeps values across unmount,
                    so `mode="wait"` is safe — nothing is lost between steps. */}
                <div className="flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentStep}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {currentStep === 1 && <BusinessProfile onEmailTakenChange={setEmailTaken} />}
                      {currentStep === 2 && <ProductRails />}
                      {currentStep === 3 && <ReviewSubmit onEditStep={(step) => setCurrentStep(step)} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {submitError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 flex items-center gap-2 rounded-mock border border-destructive/30 bg-destructive-50 px-4 py-3 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Progress + Back/Continue row — dots sit right above the action buttons */}
                <div className="mt-20 pt-10 border-t border-line pb-10 flex flex-col items-center gap-8">
                  <StepProgress currentStep={currentStep} />
                  <div className="flex w-full max-w-sm items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentStep === 1}
                      onClick={() => currentStep > 1 && setCurrentStep(prev => prev - 1)}
                      className="h-12 flex-1 rounded-pill border-line text-base font-semibold text-ink hover:bg-surface disabled:opacity-40"
                    >
                      <ChevronLeft className="mr-1.5 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="button"
                      onClick={currentStep < 3 ? validateAndProceed : openConfirm}
                      disabled={isSubmitting}
                      className="h-12 flex-2 rounded-pill bg-brand text-base font-semibold text-ink hover:bg-brand-600 transition-colors"
                    >
                      {currentStep < 3 ? 'Continue' : 'Review & submit'}
                    </Button>
                  </div>
                </div>

              </form>
            </FormProvider>

            <TrustStrip />
          </div>

        </div>
      </div>

      <ConfirmSubmitModal
        open={confirmOpen}
        submitting={isSubmitting}
        summary={confirmOpen ? confirmSummary() : []}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSubmit(onSubmit)}
      />
    </>
  );
}
