'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Wallet, DollarSign, Code, Landmark, Briefcase, Zap, Search, ChevronLeft, ShieldCheck, Rocket } from 'lucide-react';
import { register, createAnchor } from '@/lib/cp';
import { Logo, Button, Field, RadioCard, SegmentedControl } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Persona
  const [persona, setPersona] = useState('');

  // Step 3: Organization
  const [legalName, setLegalName] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('United States');
  const [teamSize, setTeamSize] = useState('1-10');

  // Step 4: Goals
  const [goal, setGoal] = useState('');

  const nextStep = () => setStep((s) => Math.min(5, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await register(email, password);
      nextStep();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createAnchor({
        name: legalName || 'My Anchor',
        legal_entity_name: legalName,
        company_type: persona,
        use_case: goal,
        country: country,
        support_email: email,
      });
      router.push('/anchor/onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { num: 1, label: 'Account Details', desc: 'Secure your login credentials' },
    { num: 2, label: 'Company Profile', desc: 'Tailor your workspace' },
    { num: 3, label: 'Organization', desc: 'Regulatory and KYC info' },
    { num: 4, label: 'Infrastructure', desc: 'Select your primary goals' },
    { num: 5, label: 'Provisioning', desc: 'Launch your sandbox' },
  ];

  return (
    <div className="min-h-screen flex bg-surface text-ink font-sans selection:bg-brand/20">
      
      {/* Left Sidebar - Premium Context */}
      <div className="hidden lg:flex w-[380px] shrink-0 flex-col border-r border-line bg-canvas p-10 relative">
        <Logo className="mb-4" />
        <p className="text-[13px] text-muted mb-16">The premium developer infrastructure for Stellar Anchors.</p>
        
        <div className="flex-1 relative">
          <div className="absolute left-[15px] top-4 bottom-8 w-[2px] bg-line z-0" />
          
          <div className="space-y-8 relative z-10">
            {steps.map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              
              return (
                <div key={s.num} className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 shadow-[0_0_0_4px_var(--color-canvas)] ${isActive ? 'bg-brand text-white' : isPast ? 'bg-ink text-white' : 'bg-surface text-muted border border-line'}`}>
                    {isPast ? <ShieldCheck className="w-4 h-4" /> : s.num}
                  </div>
                  <div>
                    <span className={`block text-[15px] ${isActive ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>{s.label}</span>
                    <span className={`block text-xs mt-1 ${isActive ? 'text-muted' : 'text-faint'}`}>{s.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto space-y-4 pt-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex h-[26px] items-center rounded-full bg-surface-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted border border-line shadow-sm">
              Built on Stellar
            </span>
          </div>
          <p className="text-[11px] font-bold text-faint uppercase tracking-widest mb-3">Resources</p>
          <a href="#" className="flex items-center gap-2.5 text-[13px] font-medium text-muted hover:text-ink transition-colors"><Search className="w-4 h-4" /> Read the Documentation</a>
          <a href="#" className="flex items-center gap-2.5 text-[13px] font-medium text-muted hover:text-ink transition-colors"><Briefcase className="w-4 h-4" /> Contact Sales & Support</a>
        </div>
      </div>

      {/* Right Canvas - Dynamic Flow */}
      <div className="flex-1 flex flex-col p-6 sm:p-12 overflow-y-auto">
        
        <div className="w-full max-w-[560px] mx-auto mt-auto mb-auto">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden w-full mb-12 flex items-center justify-between">
            <Logo />
            <span className="text-xs font-medium text-muted bg-surface-2 px-3 py-1 rounded-full border border-line">Step {step} of 5</span>
          </div>

          {error && <div className="mb-8 rounded-[16px] border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger flex items-center gap-3 animate-fadeUp"><ShieldCheck className="w-5 h-5 shrink-0"/> {error}</div>}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <div className="mb-10">
                  <h1 className="text-[32px] font-semibold tracking-tight text-ink mb-3">Create your account</h1>
                  <p className="text-[15px] text-muted leading-relaxed">Start building your financial infrastructure. You can invite your team later.</p>
                </div>
                
                <form onSubmit={handleRegister} className="space-y-6">
                  <Field label="Full Name" value={name} onChange={setName} placeholder="Jane Doe" required />
                  <Field label="Work Email" type="email" value={email} onChange={setEmail} placeholder="jane@company.com" required helperText="We recommend using your company email address." />
                  <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••••••" required />
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={loading} className="w-full" size="lg">
                      {loading ? 'Securing account...' : 'Continue'}
                    </Button>
                  </div>
                  
                  <p className="text-center text-[13px] text-muted mt-6">
                    Already have an account? <Link href="/anchor/login" className="text-brand-deep font-medium hover:underline">Sign in</Link>
                  </p>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <div className="mb-10">
                  <h1 className="text-[32px] font-semibold tracking-tight text-ink mb-3">Who are you?</h1>
                  <p className="text-[15px] text-muted leading-relaxed">We'll tailor your workspace to your regulatory and technical needs.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  <RadioCard checked={persona === 'Bank'} onChange={() => setPersona('Bank')} icon={<Landmark className="w-5 h-5"/>} title="Bank" description="Licensed banking institution" />
                  <RadioCard checked={persona === 'Fintech'} onChange={() => setPersona('Fintech')} icon={<Zap className="w-5 h-5"/>} title="Fintech" description="Digital financial services" />
                  <RadioCard checked={persona === 'Exchange'} onChange={() => setPersona('Exchange')} icon={<DollarSign className="w-5 h-5"/>} title="Exchange" description="VDA/Crypto trading platform" />
                  <RadioCard checked={persona === 'Wallet'} onChange={() => setPersona('Wallet')} icon={<Wallet className="w-5 h-5"/>} title="Wallet Provider" description="Consumer or enterprise wallets" />
                  <RadioCard checked={persona === 'MSB'} onChange={() => setPersona('MSB')} icon={<Building2 className="w-5 h-5"/>} title="MSB / Remittance" description="Cross-border payments" />
                  <RadioCard checked={persona === 'Developer'} onChange={() => setPersona('Developer')} icon={<Code className="w-5 h-5"/>} title="Developer / Other" description="Building custom integrations" />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-line/50">
                  <Button variant="ghost" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button>
                  <Button onClick={nextStep} disabled={!persona} size="lg">Continue</Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <div className="mb-10">
                  <h1 className="text-[32px] font-semibold tracking-tight text-ink mb-3">Organization Details</h1>
                  <p className="text-[15px] text-muted leading-relaxed">This information is used for initial KYC/KYB compliance checks.</p>
                </div>
                
                <div className="space-y-6 mb-10">
                  <Field label="Legal Company Name" value={legalName} onChange={setLegalName} placeholder="e.g. Acme Financial Inc." />
                  <Field label="Company Website" type="url" value={website} onChange={setWebsite} placeholder="https://acme.com" />
                  
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-ink">Country of Operation</span>
                    <select 
                      value={country} 
                      onChange={e => setCountry(e.target.value)}
                      className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink outline-none transition-all duration-200 hover:border-line-strong focus:border-brand focus:ring-[3px] focus:ring-brand/20 shadow-sm"
                    >
                      <option>United States</option>
                      <option>India</option>
                      <option>United Kingdom</option>
                      <option>Singapore</option>
                      <option>European Union</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <div>
                    <span className="mb-2.5 block text-sm font-medium text-ink">Team Size</span>
                    <SegmentedControl 
                      options={['1-10', '11-50', '51-200', '200+']} 
                      value={teamSize} 
                      onChange={setTeamSize} 
                      className="w-full flex"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-line/50">
                  <Button variant="ghost" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button>
                  <Button onClick={nextStep} disabled={!legalName} size="lg">Continue</Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <div className="mb-10">
                  <h1 className="text-[32px] font-semibold tracking-tight text-ink mb-3">What are you building?</h1>
                  <p className="text-[15px] text-muted leading-relaxed">Select the primary infrastructure you plan to deploy.</p>
                </div>
                
                <div className="space-y-4 mb-10">
                  <RadioCard checked={goal === 'Launch Anchor'} onChange={() => setGoal('Launch Anchor')} title="Launch a new fiat-backed Anchor" description="Deploy the full SEP suite for on/off ramps (SEP-24/31)." />
                  <RadioCard checked={goal === 'Integrate Anchor'} onChange={() => setGoal('Integrate Anchor')} title="Integrate an existing Anchor" description="Connect your existing payment rails to Nordstern." />
                  <RadioCard checked={goal === 'Wallet Integration'} onChange={() => setGoal('Wallet Integration')} title="Wallet & Payments Integration" description="Build seamless checkout and transfer experiences." />
                  <RadioCard checked={goal === 'Exploring'} onChange={() => setGoal('Exploring')} title="Just exploring" description="Testing the sandbox environment and APIs." />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-line/50">
                  <Button variant="ghost" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button>
                  <Button onClick={nextStep} disabled={!goal} size="lg">Review</Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <div className="mb-10">
                  <div className="w-12 h-12 bg-brand/10 rounded-[14px] flex items-center justify-center text-brand-deep mb-6 shadow-sm border border-brand/20">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <h1 className="text-[32px] font-semibold tracking-tight text-ink mb-3">You're all set.</h1>
                  <p className="text-[15px] text-muted leading-relaxed">Review your configuration before we provision your dedicated Sandbox environment.</p>
                </div>
                
                <div className="bg-canvas p-8 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-line mb-10 space-y-6">
                  <div className="grid grid-cols-2 gap-y-8">
                    <div>
                      <div className="text-[11px] font-bold text-faint mb-1.5 uppercase tracking-wider">Account</div>
                      <div className="text-[15px] font-medium text-ink">{email}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-faint mb-1.5 uppercase tracking-wider">Persona</div>
                      <div className="text-[15px] font-medium text-ink">{persona}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-faint mb-1.5 uppercase tracking-wider">Organization</div>
                      <div className="text-[15px] font-medium text-ink">{legalName || 'Not specified'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-faint mb-1.5 uppercase tracking-wider">Team Size</div>
                      <div className="text-[15px] font-medium text-ink">{teamSize}</div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-line">
                    <div className="text-[11px] font-bold text-faint mb-1.5 uppercase tracking-wider">Primary Goal</div>
                    <div className="text-[15px] font-medium text-ink">{goal}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-line/50">
                  <Button variant="ghost" onClick={prevStep} disabled={loading}><ChevronLeft className="w-4 h-4 mr-1"/> Back</Button>
                  <Button onClick={handleComplete} disabled={loading} size="lg">
                    {loading ? 'Provisioning Workspace...' : 'Launch Sandbox'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
