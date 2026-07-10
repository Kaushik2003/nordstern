import { Check, ShieldCheck, Zap, Server } from 'lucide-react';
import { cn } from '@nordstern/shared-ui';
import Image from 'next/image';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Business Profile', subtitle: 'Who you are' },
  { id: 2, title: 'Product & Rails', subtitle: 'Asset, currency, limits & fees' },
  { id: 3, title: 'Review & Submit', subtitle: 'Confirm & apply' },
];

interface SidebarStepsProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
  furthestStep: number;
}

// Premium branded rail — matches the landing aesthetic: dark noir panel, purple accent, a soft
// concentric-ring motif (flat, no heavy gradient), the value proposition, refined step tracker,
// and a trust footer. This is the founder's first impression; it should feel like the marketing site.
export function SidebarSteps({ currentStep, onStepClick, furthestStep }: SidebarStepsProps) {
  return (
    <aside className="relative hidden w-[380px] shrink-0 flex-col justify-between overflow-hidden bg-noir p-10 text-white lg:flex xl:p-12">
      {/* Flat brand motif — concentric rings + a solid brand disc (no gradient). */}
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem]">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-[12%] rounded-full border border-white/[0.07]" />
        <div className="absolute inset-[26%] rounded-full border border-white/[0.05]" />
        <div className="absolute inset-[42%] rounded-full bg-brand/20 blur-2xl" />
      </div>

      {/* Brand */}
      <div className="relative flex items-center gap-3">
        <Image src="/logo.png" alt="NordStern" width={32} height={32} className="h-8 w-8" />
        <span className="text-xl font-bold tracking-tight">
          <span className="text-white">Nord</span><span className="text-brand">Stern</span>
        </span>
      </div>

      {/* Value proposition + step tracker */}
      <div className="relative">
        <h1 className="text-3xl font-bold leading-[1.15] tracking-tight xl:text-[2rem]">
          Launch a compliant<br />anchor — without<br />building the stack.
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
          Bring your liquidity and bank relationship. We provide the SEP servers, KYC, payment
          rails, and the operator console.
        </p>

        {/* Step tracker */}
        <div className="relative mt-10 ml-1 space-y-8">
          <div className="absolute left-[13px] top-3 bottom-6 w-px bg-white/15 -z-10" />
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = step.id < currentStep;
            const isClickable = step.id <= furthestStep;
            return (
              <div
                key={step.id}
                className={cn('group flex gap-4', isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40')}
                onClick={() => { if (isClickable) onStepClick(step.id); }}
              >
                <div className={cn(
                  'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-4 ring-noir transition-all',
                  isActive || isCompleted ? 'bg-brand text-noir' : 'border border-white/25 bg-white/5 text-white/60 group-hover:border-brand/60',
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.id}
                </div>
                <div className="flex flex-col">
                  <span className={cn('text-sm font-semibold transition-colors', isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/60')}>
                    {step.title}
                  </span>
                  <span className="mt-0.5 text-xs text-white/40">{step.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust footer */}
      <div className="relative space-y-2.5 text-xs text-white/50">
        <TrustRow icon={<ShieldCheck className="h-4 w-4" />} label="KYC & compliance handled for you" />
        <TrustRow icon={<Zap className="h-4 w-4" />} label="Fast settlement on Stellar" />
        <TrustRow icon={<Server className="h-4 w-4" />} label="SEP servers & operator console included" />
      </div>
    </aside>
  );
}

function TrustRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-brand">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
