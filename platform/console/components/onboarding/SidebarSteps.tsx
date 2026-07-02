import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import Image from 'next/image';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Corporate Profile', subtitle: 'Entity & corridors' },
  { id: 2, title: 'Stellar Asset', subtitle: 'On-chain identity' },
  { id: 3, title: 'Settlement Rails', subtitle: 'Off-chain limits & fees' },
  { id: 4, title: 'Compliance & KYC', subtitle: 'Licensing & vendor' },
  { id: 5, title: 'Review & Launch', subtitle: 'Endpoint connection' },
];

interface SidebarStepsProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
  furthestStep: number;
}

export function SidebarSteps({ currentStep, onStepClick, furthestStep }: SidebarStepsProps) {
  return (
    <div className="w-[320px] shrink-0 p-8 lg:p-12 bg-surface border-r border-line hidden lg:flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="mb-16 flex items-center gap-3">
        <Image src="/logo.png" alt="NordStern Logo" width={32} height={32} className="h-8 w-8" />
        <div className="font-bold text-xl tracking-tight">
          <span className="text-ink">Nord</span>
          <span className="text-brand">Stern</span>
        </div>
      </div>

      <div className="space-y-12 relative ml-2">
        {/* Connecting line */}
        <div className="absolute left-[11px] top-4 bottom-8 w-px bg-line -z-10" />

        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= furthestStep;

          return (
            <div 
              key={step.id} 
              className={cn("flex gap-5 relative group", isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50')}
              onClick={() => {
                if (isClickable) onStepClick(step.id);
              }}
            >
              <div 
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all mt-0.5",
                  isActive 
                    ? "bg-brand text-white ring-4 ring-surface" 
                    : isCompleted
                      ? "bg-brand text-white ring-4 ring-surface"
                      : "bg-canvas border-2 border-line text-subtle ring-4 ring-surface group-hover:border-brand/50"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : <span className="text-xs font-bold">{step.id}</span>}
              </div>
              <div className="flex flex-col">
                <span className={cn("text-sm font-semibold transition-colors", isActive ? "text-brand" : "text-ink")}>
                  {step.id}. {step.title}
                </span>
                <span className="text-xs text-subtle mt-1 font-medium">{step.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
