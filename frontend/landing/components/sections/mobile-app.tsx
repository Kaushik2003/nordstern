"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Apple,
  BadgeCheck,
  Banknote,
  Check,
  ChevronLeft,
  Landmark,
  Play,
  ReceiptText,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const steps = [
  { label: "Choose", caption: "Pick an Anchor, payment rail, and amount" },
  { label: "Verify once", caption: "Complete a guided identity check" },
  { label: "Move money", caption: "Deposit or withdraw from your wallet" },
] as const;

export function MobileApp() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % steps.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <Section id="mobile-app" tone="canvas" className="overflow-hidden">
      <div className="grid items-center gap-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <Reveal>
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
              <Smartphone className="size-3.5" /> Built for your customers
            </span>
            <h2 className="mt-5 text-[clamp(2.2rem,4.5vw,4rem)] font-normal leading-[1.03] tracking-[-0.035em] text-ink">
              One app. <span className="text-muted">A network of Anchors.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
              Give customers one polished place to discover your Anchor, compare available routes, deposit with their preferred payment method, and withdraw back to fiat. Their assets remain connected to the Stellar wallet they choose.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#" aria-label="Download NordStern on the Apple App Store" className="inline-flex min-w-40 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-noir-soft hover:shadow-md">
                <Apple className="size-6 fill-current" />
                <span className="text-left leading-none"><span className="block text-[9px] uppercase tracking-wide text-white/65">Download on the</span><span className="mt-1 block text-sm font-medium">App Store</span></span>
              </a>
              <a href="#" aria-label="Get NordStern on Google Play" className="inline-flex min-w-40 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-noir-soft hover:shadow-md">
                <Play className="size-5 fill-current" />
                <span className="text-left leading-none"><span className="block text-[9px] uppercase tracking-wide text-white/65">Get it on</span><span className="mt-1 block text-sm font-medium">Google Play</span></span>
              </a>
              <a href="#" className="group inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50">
                Learn more about the app
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="mt-10 space-y-1">
              {steps.map((step, index) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition ${active === index ? "bg-surface" : "hover:bg-surface/60"}`}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-medium transition ${active === index ? "bg-ink text-white" : "border border-line bg-white text-subtle"}`}>
                    0{index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium transition ${active === index ? "text-ink" : "text-muted"}`}>{step.label}</span>
                    <span className="mt-0.5 block text-xs text-subtle">{step.caption}</span>
                  </span>
                  <ArrowRight className={`size-4 transition ${active === index ? "translate-x-0 text-brand-700 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"}`} />
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6 text-xs text-muted">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-700" /> Verified Anchors</span>
              <span className="flex items-center gap-2"><Zap className="size-4 text-brand-700" /> Multiple payment rails</span>
              <span className="flex items-center gap-2"><WalletCards className="size-4 text-brand-700" /> Deposit and withdraw</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12} y={28}>
          <div className="relative mx-auto min-h-[680px] w-full max-w-[680px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,207,247,.8),rgba(244,242,253,.28)_52%,transparent_72%)]" />
            <div className="absolute left-[5%] top-[16%] h-44 w-44 rounded-full border border-brand-100/80" />
            <div className="absolute bottom-[12%] right-[2%] h-56 w-56 rounded-full border border-line" />

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 z-10 w-[300px] -translate-x-1/2 -translate-y-1/2 sm:w-[324px]"
            >
              <div className="rounded-[3.25rem] border border-black/10 bg-[#151519] p-[7px] shadow-[0_42px_90px_-32px_rgba(30,25,60,.55)]">
                <div className="relative h-[640px] overflow-hidden rounded-[2.85rem] bg-[#f8f8fa]">
                  <div className="absolute left-1/2 top-2 z-30 h-7 w-24 -translate-x-1/2 rounded-full bg-[#151519]" />
                  <div className="flex items-center justify-between px-7 pt-4 text-[10px] font-semibold text-ink">
                    <span>9:41</span>
                    <div className="flex items-center gap-1"><span className="h-2.5 w-3.5 rounded-sm border border-ink/50" /><span className="h-2 w-0.5 rounded-full bg-ink/50" /></div>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, x: 22, filter: "blur(4px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: -18, filter: "blur(3px)" }}
                      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-0 bottom-0 top-9"
                    >
                      {active === 0 && <DepositScreen />}
                      {active === 1 && <VerificationScreen />}
                      {active === 2 && <SuccessScreen />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <motion.div animate={{ y: active === 1 ? -5 : 0 }} className="absolute left-0 top-[20%] z-20 hidden w-48 rounded-2xl border border-line bg-white/90 p-4 shadow-[0_18px_48px_-24px_rgba(20,20,40,.45)] backdrop-blur sm:block">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-subtle"><ShieldCheck className="size-3.5 text-brand-700" /> Verification</div>
              <div className="mt-3 flex items-center justify-between"><span className="text-xs font-medium text-ink">Identity secured</span><BadgeCheck className="size-4 text-emerald-600" /></div>
            </motion.div>

            <motion.div animate={{ y: active === 2 ? -8 : 0 }} className="absolute bottom-[18%] right-0 z-20 hidden w-52 rounded-2xl border border-line bg-white/90 p-4 shadow-[0_18px_48px_-24px_rgba(20,20,40,.45)] backdrop-blur sm:block">
              <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-subtle">Wallet balance</span><span className="size-2 rounded-full bg-emerald-500" /></div>
              <p className="mt-2 text-2xl font-medium tracking-tight text-ink">₹25,000.00</p>
              <p className="mt-1 text-[10px] text-emerald-700">Deposit received</p>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function AppHeader({ title, back = true }: { title: string; back?: boolean }) {
  return <div className="flex items-center justify-between px-6 pt-7"><span className="grid size-9 place-items-center rounded-full bg-white shadow-sm">{back ? <ChevronLeft className="size-4" /> : <Sparkles className="size-4 text-brand-700" />}</span><span className="text-sm font-medium">{title}</span><span className="size-9 rounded-full bg-brand-100" /></div>;
}

function DepositScreen() {
  const [rail, setRail] = useState("UPI");
  return <div className="h-full"><AppHeader title="Add funds" /><div className="px-6 pt-5"><button type="button" className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"><span className="grid size-8 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">NS</span><span className="flex-1"><span className="block text-[9px] uppercase tracking-wide text-subtle">Selected Anchor</span><span className="mt-0.5 block text-xs font-medium">NordStern INR</span></span><span className="text-[10px] text-brand-700">Change</span></button><p className="mt-5 text-xs text-muted">You&apos;re depositing</p><div className="mt-2 flex items-baseline gap-1"><span className="text-xl text-muted">₹</span><span className="text-[44px] font-medium leading-none tracking-[-0.04em]">25,000</span></div><p className="mt-2 text-xs text-subtle">≈ 25,000 ANCH</p><div className="mt-5"><p className="text-xs font-medium text-muted">Pay with</p><div className="mt-3 space-y-2">{[{ name: "UPI", icon: <Zap /> }, { name: "IMPS", icon: <Landmark /> }, { name: "Bank transfer", icon: <Banknote /> }].map((item) => <button key={item.name} type="button" onClick={() => setRail(item.name)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${rail === item.name ? "border-brand-300 bg-brand-50" : "border-line bg-white"}`}><span className="grid size-8 place-items-center rounded-xl bg-white text-brand-700 shadow-sm [&>svg]:size-4">{item.icon}</span><span className="flex-1 text-sm font-medium">{item.name}</span><span className={`grid size-4 place-items-center rounded-full border ${rail === item.name ? "border-brand-700" : "border-line"}`}>{rail === item.name && <span className="size-2 rounded-full bg-brand-700" />}</span></button>)}</div></div><button className="mt-5 w-full rounded-2xl bg-ink py-4 text-sm font-medium text-white">Continue</button></div></div>;
}

function VerificationScreen() {
  return <div className="h-full"><AppHeader title="Quick verification" /><div className="px-6 pt-7"><div className="rounded-[1.75rem] bg-[linear-gradient(145deg,#e9e5fb,#f5f3fc)] p-5"><div className="grid size-11 place-items-center rounded-2xl bg-white text-brand-700 shadow-sm"><ScanFace className="size-5" /></div><h3 className="mt-5 text-xl font-medium tracking-tight">Confirm it&apos;s you</h3><p className="mt-2 text-xs leading-relaxed text-muted">Your information is encrypted and used only to complete this transfer.</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white"><motion.div initial={{ width: "25%" }} animate={{ width: "78%" }} transition={{ duration: 3.2, ease: "easeInOut" }} className="h-full rounded-full bg-brand-700" /></div></div><div className="mt-6 space-y-1"><VerifyRow icon={<BadgeCheck />} title="Identity check" status="Complete" done /><VerifyRow icon={<ScanFace />} title="Face verification" status="Complete" done /><VerifyRow icon={<Landmark />} title="Bank verification" status="In progress" /></div><div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-subtle"><ShieldCheck className="size-3.5" /> Protected by NordStern</div></div></div>;
}

function VerifyRow({ icon, title, status, done }: { icon: React.ReactNode; title: string; status: string; done?: boolean }) {
  return <div className="flex items-center gap-3 rounded-2xl p-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-brand-700 shadow-sm [&>svg]:size-4">{icon}</span><span className="flex-1 text-sm font-medium">{title}</span><span className={`text-[10px] ${done ? "text-emerald-700" : "text-brand-700"}`}>{status}</span>{done ? <Check className="size-3.5 text-emerald-600" /> : <span className="size-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />}</div>;
}

function SuccessScreen() {
  return <div className="flex h-full flex-col px-6 pb-6 pt-10"><div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-100"><motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.12 }} className="grid size-14 place-items-center rounded-full bg-brand-700 text-white shadow-[0_10px_30px_rgba(111,95,214,.3)]"><Check className="size-7" strokeWidth={2.5} /></motion.div></div><div className="mt-6 text-center"><p className="text-2xl font-medium tracking-tight">Deposit complete</p><p className="mt-2 text-xs text-muted">Your assets are now in your wallet.</p></div><div className="mt-8 rounded-[1.75rem] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs text-muted">Assets received</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-700">SETTLED</span></div><p className="mt-3 text-3xl font-medium tracking-tight">25,000.00 <span className="text-sm text-muted">ANCH</span></p><div className="mt-5 border-t border-line pt-4"><ReceiptRow label="Payment rail" value="UPI" /><ReceiptRow label="Stellar fee" value="₹0.00" /><ReceiptRow label="Reference" value="NS·8F2KQ9" /></div></div><button className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-4 text-sm font-medium"><ReceiptText className="size-4" /> View receipt</button></div>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-1.5 text-xs"><span className="text-subtle">{label}</span><span className="font-medium text-ink">{value}</span></div>;
}
