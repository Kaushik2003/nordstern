'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, OnboardingFormValues } from '@/lib/validations/onboarding';
import { SidebarSteps } from '@/components/onboarding/SidebarSteps';
import { BusinessProfile } from '@/components/onboarding/steps/BusinessProfile';
import { ProductRails } from '@/components/onboarding/steps/ProductRails';
import { ReviewSubmit } from '@/components/onboarding/steps/ReviewSubmit';
import { Button } from '@nordstern/shared-ui';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      companyProfile: {
        targetMarkets: [],
        supportedFiat: '',
      },
      product: {
        mode: 'test',
        supportedRails: [],
      },
    }
  });

  const { trigger, handleSubmit, formState: { isSubmitting } } = methods;

  const validateAndProceed = async () => {
    let fieldsToValidate: string[] = [];
    
    switch (currentStep) {
      case 1: fieldsToValidate = ['companyProfile']; break;
      case 2: fieldsToValidate = ['product']; break;
    }

    const isValid = await trigger(fieldsToValidate as any);

    if (isValid && currentStep < 3) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep > furthestStep) setFurthestStep(nextStep);
    }
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    try {
      const res = await fetch('/api/v1/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error || 'Submission failed');
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStepClick = (step: number) => {
    // Only allow navigating to a step if we've already reached it
    if (step <= furthestStep) {
      setCurrentStep(step);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas w-full h-screen">
        <div className="max-w-md w-full text-center p-12 border border-line shadow-sm rounded-2xl bg-canvas">
          <div className="flex justify-center mb-8">
            <CheckCircle2 className="h-20 w-20 text-brand" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-ink">Application Submitted</h2>
          <p className="text-base text-subtle mb-10 leading-relaxed">
            Your infrastructure parameters have been sent for vetting. We will contact your primary representative shortly to proceed.
          </p>
          <Button asChild className="w-full bg-brand text-white hover:bg-brand-600 rounded-lg h-12 text-base font-medium">
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
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
        
        <div className="w-full max-w-3xl mx-auto px-6 py-12 lg:px-12 flex flex-col min-h-full">
          
          {/* Top Navigation Row */}
          <div className="flex items-center justify-between mb-12">
            <Button 
              type="button" 
              variant="ghost" 
              className="text-subtle hover:text-ink px-0"
              disabled={currentStep === 1}
              onClick={() => currentStep > 1 && setCurrentStep(prev => prev - 1)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="text-sm font-medium text-brand bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
              Step {currentStep} of 3
            </div>
          </div>

          {/* Form Container */}
          <div className="flex-1 flex flex-col">
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
                
                {/* Step Content Rendering */}
                <div className="flex-1">
                  {currentStep === 1 && <BusinessProfile />}
                  {currentStep === 2 && <ProductRails />}
                  {currentStep === 3 && <ReviewSubmit onEditStep={(step) => setCurrentStep(step)} />}
                </div>

                {/* Next/Submit Button Row */}
                <div className="flex justify-end mt-16 pt-8 border-t border-line pb-8">
                  {currentStep < 3 ? (
                    <Button 
                      type="button" 
                      onClick={validateAndProceed}
                      className="bg-brand text-white hover:bg-brand-600 rounded-lg px-10 h-12 text-base font-medium transition-colors"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-brand text-white hover:bg-brand-600 rounded-lg px-10 h-12 text-base font-medium transition-colors"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Infrastructure Application'}
                    </Button>
                  )}
                </div>

              </form>
            </FormProvider>
          </div>

        </div>
      </div>
    </>
  );
}
