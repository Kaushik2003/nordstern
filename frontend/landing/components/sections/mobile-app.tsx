"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Fingerprint,
  House,
  Landmark,
  Lock,
  Plus,
  ScanFace,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { AppStoreButton, GooglePlayButton } from "@/components/base/buttons/app-store-buttons";

/* -------------------------------------------------------------------------- *
 * The mobile journey. Five screens tell one continuous on/off-ramp story:
 * discover an Anchor → verify once → deposit fiat → hold USDC → cash out.
 * The left rail drives the phone; the phone auto-advances when idle.
 * -------------------------------------------------------------------------- */

const JOURNEY = [
  { label: "Discover Anchors", caption: "Compare rails, fees & settlement time" },
  { label: "Verify once", caption: "One guided KYC, reused everywhere" },
  { label: "Deposit", caption: "Pay by UPI, IMPS or bank transfer" },
  { label: "Receive & hold", caption: "USDC lands in your Stellar wallet" },
  { label: "Withdraw", caption: "Cash out to any linked bank" },
] as const;

const SCREENS = [DiscoverScreen, VerifyScreen, DepositScreen, WalletScreen, WithdrawScreen];

export function MobileApp() {
  // [index, direction] — direction feeds the slide variants below.
  const [[page, direction], setPage] = useState<[number, number]>([0, 0]);
  const reduceMotion = useReducedMotion();

  const go = (target: number) =>
    setPage(([current]) => [target, target === current ? 0 : target > current ? 1 : -1]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(
      () => setPage(([current]) => [(current + 1) % SCREENS.length, 1]),
      4800,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const Screen = SCREENS[page];

  return (
    <Section id="mobile-app" tone="canvas" className="overflow-hidden">
      <div className="grid items-center gap-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <Reveal>
          <div className="max-w-xl">
            <h2 className="text-[clamp(2.2rem,4.5vw,4rem)] font-normal leading-[1.03] tracking-[-0.035em] text-ink">
              One app to on-ramp and off-ramp. <span className="text-muted">Across a network of Anchors.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
              A consumer app that connects people to a network of licensed Anchors to move money on and off Stellar. They pick an Anchor, verify once, then deposit rupees to receive USDC — or send it straight back to their bank. Funds never leave the Stellar wallet they already trust.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <AppStoreButton size="lg" className="transition hover:-translate-y-0.5 hover:shadow-lg" />
              <GooglePlayButton size="lg" className="transition hover:-translate-y-0.5 hover:shadow-lg" />
              <a
                href="#"
                className="group inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50"
              >
                Take the tour
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="mt-10 space-y-1" role="tablist" aria-label="App journey">
              {JOURNEY.map((step, index) => {
                const isActive = page === index;
                return (
                  <button
                    key={step.label}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => go(index)}
                    className={`group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition ${isActive ? "bg-surface" : "hover:bg-surface/60"}`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-medium transition ${isActive ? "bg-ink text-white" : "border border-line bg-white text-subtle"}`}>
                      {isActive ? <Check className="size-4" /> : `0${index + 1}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium transition ${isActive ? "text-ink" : "text-muted"}`}>{step.label}</span>
                      <span className="mt-0.5 block text-xs text-subtle">{step.caption}</span>
                    </span>
                    <ArrowRight className={`size-4 transition ${isActive ? "translate-x-0 text-brand-700 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-50"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12} y={28}>
          <div className="relative mx-auto min-h-[840px] w-full max-w-[680px]">
            {/* Ambient scenery behind the device */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,207,247,.75),rgba(244,242,253,.24)_54%,transparent_72%)]" />
            <div className="pointer-events-none absolute left-[4%] top-[14%] h-44 w-44 rounded-full border border-brand-100/80" />
            <div className="pointer-events-none absolute bottom-[10%] right-[1%] h-56 w-56 rounded-full border border-line" />

            <PhoneFrame reduceMotion={!!reduceMotion}>
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={page}
                  custom={direction}
                  variants={reduceMotion ? undefined : slideVariants}
                  initial={reduceMotion ? { opacity: 0 } : "enter"}
                  animate={reduceMotion ? { opacity: 1 } : "center"}
                  exit={reduceMotion ? { opacity: 0 } : "exit"}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </PhoneFrame>

            {/* Story-driven live notifications — one status header, one detail card */}
            <NotificationCard active={page} />
            <DetailCard active={page} />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 48 : -48, opacity: 0, scale: 0.97, filter: "blur(6px)" }),
  center: { x: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir >= 0 ? -48 : 48, opacity: 0, scale: 0.97, filter: "blur(6px)" }),
};

/* -------------------------------------------------------------------------- *
 * Device shell — titanium bezel, dynamic island, fixed status bar + home bar.
 * Screens slide inside the content region; the chrome never moves.
 * -------------------------------------------------------------------------- */

function PhoneFrame({ children, reduceMotion }: { children: ReactNode; reduceMotion: boolean }) {
  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-1/2 top-1/2 z-10 w-[384px] -translate-x-1/2 -translate-y-1/2"
    >
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[122px] h-8 w-[3px] rounded-l bg-[#0b0b0d]" />
      <span className="absolute -left-[3px] top-[168px] h-12 w-[3px] rounded-l bg-[#0b0b0d]" />
      <span className="absolute -left-[3px] top-[228px] h-12 w-[3px] rounded-l bg-[#0b0b0d]" />
      <span className="absolute -right-[3px] top-[196px] h-16 w-[3px] rounded-r bg-[#0b0b0d]" />

      <div className="relative rounded-[3.5rem] bg-[linear-gradient(150deg,#3a3a42,#141418_38%,#0b0b0d)] p-[11px] shadow-[0_60px_120px_-34px_rgba(35,28,80,.6),0_28px_60px_-30px_rgba(20,20,40,.5)]">
        <div className="pointer-events-none absolute inset-0 rounded-[3.5rem] ring-1 ring-white/12" />
        <div className="pointer-events-none absolute inset-[4px] rounded-[3.3rem] ring-1 ring-black/50" />

        <div className="relative flex h-[772px] flex-col overflow-hidden rounded-[2.85rem] bg-[#f6f6f9]">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-[11px] z-30 flex h-[30px] w-[104px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
            <span className="size-2 rounded-full bg-[#1c1c22] ring-1 ring-white/10" />
          </div>

          <StatusBar />

          <div className="relative flex-1 overflow-hidden">{children}</div>

          {/* home indicator */}
          <div className="flex justify-center py-2.5">
            <span className="h-[5px] w-[118px] rounded-full bg-black/25" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBar() {
  return (
    <div className="relative z-20 flex items-center justify-between px-7 pb-1 pt-3.5 text-[13px] font-semibold text-ink">
      <span className="tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5">
        {/* signal */}
        <span className="flex items-end gap-[2px]">
          <span className="h-1.5 w-[3px] rounded-[1px] bg-ink" />
          <span className="h-2 w-[3px] rounded-[1px] bg-ink" />
          <span className="h-2.5 w-[3px] rounded-[1px] bg-ink" />
          <span className="h-3 w-[3px] rounded-[1px] bg-ink" />
        </span>
        <Wifi className="size-3.5" strokeWidth={2.5} />
        {/* battery */}
        <span className="ml-0.5 flex items-center">
          <span className="relative h-3 w-6 rounded-[3px] border border-ink/40 p-[1.5px]">
            <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
          </span>
          <span className="ml-[1px] h-1.5 w-[1.5px] rounded-r bg-ink/40" />
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Shared screen atoms
 * -------------------------------------------------------------------------- */

function ScreenShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}

function ModalHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-2.5 pb-1.5">
      <span className="grid size-8 place-items-center rounded-full bg-white text-ink shadow-[0_2px_8px_rgba(20,20,40,.08)]">
        <ChevronLeft className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">{title}</span>
      <span className="grid size-8 place-items-center rounded-full bg-white text-subtle shadow-[0_2px_8px_rgba(20,20,40,.08)]">
        <Lock className="size-3.5" />
      </span>
    </div>
  );
}

function TabBar({ active }: { active: "home" | "wallet" | "activity" | "account" }) {
  const tabs = [
    { id: "home", label: "Home", icon: House },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "account", label: "Account", icon: User },
  ] as const;
  return (
    <div className="mt-1.5 flex items-stretch justify-around border-t border-line bg-white/85 px-3 pt-2 pb-1 backdrop-blur">
      {tabs.map((tab) => {
        const on = tab.id === active;
        const Icon = tab.icon;
        return (
          <span key={tab.id} className={`flex flex-1 flex-col items-center gap-1 ${on ? "text-brand-700" : "text-subtle"}`}>
            <Icon className="size-[18px]" strokeWidth={on ? 2.4 : 2} />
            <span className="text-[9px] font-medium">{tab.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="px-5 pb-4 pt-1">
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(11,11,11,.5)] transition active:scale-[0.99]">
        {children}
      </button>
      {hint && <p className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-subtle">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Screen 1 — Discover an Anchor
 * -------------------------------------------------------------------------- */

/* Internal Anchor identity system — a two-letter monogram per provider on a
 * soft gradient app-icon tile. Shared design language (same radius, inset ring,
 * top sheen and shadow) so they read as one licensed-institution ecosystem. */
const GRAD = {
  purple: "linear-gradient(147deg,#9a8cf0,#6f5fd6)",
  indigo: "linear-gradient(147deg,#6070d2,#38449c)",
  teal: "linear-gradient(147deg,#37b0a6,#1f827b)",
} as const;

function AnchorMark({ code, grad, size = "md" }: { code: string; grad: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 text-[10px]" : "size-10 text-[13px]";
  const r = size === "sm" ? "rounded-[10px]" : "rounded-[13px]";
  const rt = size === "sm" ? "rounded-t-[10px]" : "rounded-t-[13px]";
  return (
    <span className={`relative grid ${box} ${r} shrink-0 place-items-center font-semibold tracking-tight text-white shadow-[0_5px_12px_-4px_rgba(30,25,70,.5)]`} style={{ backgroundImage: grad }}>
      <span className={`pointer-events-none absolute inset-0 ${r} ring-1 ring-inset ring-white/25`} />
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 ${rt} bg-gradient-to-b from-white/20 to-transparent`} />
      <span className="relative">{code}</span>
    </span>
  );
}

/* Real stablecoin marks (Circle USDC, Tether USDT) — settled assets shown with
 * their actual brand logos so balances read as credible on-chain holdings. */
function CoinLogo({ coin, className = "size-5" }: { coin: "usdc" | "usdt"; className?: string }) {
  if (coin === "usdt") {
    return (
      <svg viewBox="0 0 32 32" className={`${className} shrink-0`} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path fill="#fff" d="M17.92 17.38v-.002c-.11.008-.68.042-1.94.042-1.01 0-1.72-.03-1.97-.042v.003c-3.89-.171-6.79-.848-6.79-1.658 0-.809 2.9-1.486 6.79-1.66v2.644c.25.018.98.061 1.99.061 1.2 0 1.81-.05 1.92-.06v-2.643c3.88.173 6.78.85 6.78 1.658 0 .81-2.9 1.485-6.78 1.657m0-3.59v-2.366h5.42V7.82H8.6v3.607h5.41v2.365c-4.4.202-7.71 1.074-7.71 2.118 0 1.044 3.31 1.915 7.71 2.118v7.582h3.91v-7.584c4.39-.202 7.69-1.073 7.69-2.116 0-1.043-3.3-1.914-7.69-2.117" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0`} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path fill="#fff" d="M20.02 18.12c0-2.12-1.28-2.85-3.84-3.15-1.83-.25-2.19-.73-2.19-1.58s.61-1.4 1.83-1.4c1.1 0 1.7.37 2.01 1.28.06.18.24.3.43.3h.97c.24 0 .43-.18.43-.42v-.06a3.04 3.04 0 00-2.74-2.49V9.14c0-.24-.18-.42-.49-.48h-.91c-.24 0-.43.18-.49.48v1.4c-1.83.24-2.99 1.46-2.99 2.97 0 2 1.22 2.79 3.78 3.1 1.71.3 2.26.67 2.26 1.64 0 .97-.85 1.64-2.01 1.64-1.59 0-2.13-.67-2.32-1.58-.06-.24-.24-.36-.43-.36h-1.03a.42.42 0 00-.43.42v.06c.24 1.52 1.22 2.61 3.23 2.91v1.46c0 .24.18.42.49.49h.91c.24 0 .43-.18.49-.49v-1.46c1.83-.3 3.05-1.58 3.05-3.22z" />
      <path fill="#fff" d="M12.89 24.82c-4.75-1.7-7.19-6.99-5.42-11.67.91-2.55 2.92-4.49 5.42-5.4.24-.12.36-.3.36-.61v-.85c0-.24-.12-.42-.36-.48-.06 0-.18 0-.24.06a10.9 10.9 0 00-7.13 13.74c1.1 3.4 3.72 6.01 7.13 7.1.24.12.49 0 .55-.24.06-.06.06-.12.06-.24v-.85c0-.18-.18-.42-.37-.55zm6.46-19.26c-.24-.12-.49 0-.55.24-.06.06-.06.12-.06.24v.85c0 .24.18.49.36.61 4.75 1.7 7.19 6.99 5.42 11.67-.91 2.55-2.92 4.49-5.42 5.4-.24.12-.36.3-.36.61v.85c0 .24.12.42.36.49.06 0 .18 0 .24-.06a10.9 10.9 0 007.13-13.74c-1.1-3.46-3.78-6.07-7.13-7.16z" />
    </svg>
  );
}

/* Stellar (XLM) network mark — the settlement rail, shown with its rocket
 * roundel so "Stellar Network" reads as a real on-chain venue. */
function StellarLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0`} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#0b0b0d" />
      <g fill="#fff">
        <path d="M16 6.6c2.25 1.7 3.5 4.2 3.5 7.2v2.8l-1.5 1.6h-4l-1.5-1.6v-2.8c0-3 1.25-5.5 3.5-7.2Z" />
        <path d="M12.5 14.9 10.5 17.6v1.8l2-1.15Zm7 0 2 2.7v1.8l-2-1.15Z" />
        <path d="M14.75 19.4h2.5L16 22.5Z" />
      </g>
      <circle cx="16" cy="12.7" r="1.35" fill="#0b0b0d" />
    </svg>
  );
}

/* HDFC Bank mark — the linked payout account, shown with the bank's
 * recognizable navy block + red frame so the destination reads as real. */
function HdfcLogo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`${className} shrink-0 rounded-xl shadow-sm ring-1 ring-black/5`} aria-hidden>
      <rect width="40" height="40" fill="#fff" />
      {/* solid navy square, bottom-right */}
      <rect x="14" y="14" width="19" height="19" fill="#004C8F" />
      {/* red outline square, offset top-left — HDFC's overlapping-squares mark */}
      <rect x="7" y="7" width="19" height="19" fill="none" stroke="#ED232A" strokeWidth="2.4" />
    </svg>
  );
}

const ANCHORS = [
  { name: "NordStern India", rating: "4.9", rails: "UPI · IMPS · RTGS", fee: "0.4%", eta: "~90s", selected: true, code: "NS", grad: GRAD.purple },
  { name: "RupeeBridge", rating: "4.7", rails: "UPI · IMPS", fee: "0.6%", eta: "~3 min", selected: false, code: "RB", grad: GRAD.indigo },
  { name: "StellarPay IN", rating: "4.8", rails: "IMPS · NEFT", fee: "0.5%", eta: "~2 min", selected: false, code: "SP", grad: GRAD.teal },
] as const;

function DiscoverScreen() {
  return (
    <ScreenShell>
      <div className="px-5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-subtle">Good morning, Bhavesh</p>
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">Choose an Anchor</h3>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(140deg,#c9b8f0,#8b7ee0)] text-[12px] font-semibold text-white">B</span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2.5 shadow-[0_2px_10px_rgba(20,20,40,.04)]">
          <Search className="size-4 text-subtle" />
          <span className="text-[13px] text-subtle">Search Anchors or payment rails</span>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-2.5 overflow-hidden px-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">Available in India · 6</span>
          <span className="flex items-center gap-1 text-[11px] text-brand-700">Filter <ChevronRight className="size-3" /></span>
        </div>

        {ANCHORS.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-2xl border p-3 ${a.selected ? "border-brand-300 bg-brand-50/60 ring-1 ring-brand-200" : "border-line bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <AnchorMark code={a.code} grad={a.grad} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{a.name}</span>
                  <BadgeCheck className="size-3.5 shrink-0 text-brand-700" />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-subtle">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {a.rating}
                  <span className="text-line">·</span>
                  {a.rails}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-ink">{a.fee}</p>
                <p className="text-[9.5px] text-subtle">fee</p>
              </div>
            </div>
            {a.selected && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white/70 px-2.5 py-1.5">
                <span className="flex items-center gap-1 text-[10.5px] text-muted"><Clock className="size-3" /> {a.eta} settlement</span>
                <span className="flex items-center gap-1 text-[10.5px] font-medium text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> Anchor selected</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <TabBar active="home" />
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- *
 * Screen 2 — Identity verification
 * -------------------------------------------------------------------------- */

function VerifyScreen() {
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <ScreenShell>
      <ModalHeader title="Verify identity" />
      <div className="flex-1 px-5">
        <div className="flex flex-col items-center pt-3">
          <div className="relative size-[108px]">
            <svg viewBox="0 0 108 108" className="size-full -rotate-90">
              <circle cx="54" cy="54" r={R} fill="none" stroke="#e9e5fb" strokeWidth="6" />
              <motion.circle
                cx="54" cy="54" r={R} fill="none" stroke="#6f5fd6" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * 0.04 }}
                transition={{ duration: 1.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <span className="absolute inset-[14px] grid place-items-center rounded-full bg-[linear-gradient(150deg,#f0edfd,#e2ddfa)] text-brand-700">
              <ScanFace className="size-8" strokeWidth={1.6} />
            </span>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 1.6 }}
              className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-emerald-500 text-white ring-4 ring-[#f6f6f9]"
            >
              <Check className="size-4" strokeWidth={3} />
            </motion.span>
          </div>
          <h4 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">You&apos;re verified</h4>
          <p className="mt-1 max-w-[220px] text-center text-[12px] leading-relaxed text-muted">
            Complete KYC once — it&apos;s reused across every Anchor on the network.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-[10.5px] font-medium text-brand-800">
            <ShieldCheck className="size-3.5 text-brand-700" /> KYC powered by <span className="font-semibold text-ink">Didit</span>
          </span>
        </div>

        <div className="mt-4 space-y-1 rounded-2xl border border-line bg-white p-2 shadow-[0_2px_10px_rgba(20,20,40,.04)]">
          <StepRow icon={<CircleCheck className="size-full" />} title="PAN & identity" sub="Verified with DigiLocker" done />
          <StepRow icon={<ScanFace className="size-full" />} title="Selfie & liveness" sub="Liveness verified by Didit" done />
          <StepRow icon={<Landmark className="size-full" />} title="Bank account linked" sub="HDFC •••• 4291" done />
        </div>

        <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[10.5px] text-subtle">
          <Lock className="size-3" /> Didit-secured · 256-bit encrypted, never shared without consent
        </p>
      </div>
      <PrimaryButton hint={<><Fingerprint className="size-3.5" /> Confirm with Face ID</>}>Continue to deposit</PrimaryButton>
    </ScreenShell>
  );
}

function StepRow({ icon, title, sub, done }: { icon: ReactNode; title: string; sub: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span className={`grid size-8 shrink-0 place-items-center rounded-xl [&>svg]:size-4 ${done ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-700"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{title}</span>
        <span className="block text-[10.5px] text-subtle">{sub}</span>
      </span>
      {done ? (
        <CircleCheck className="size-[18px] text-emerald-500" />
      ) : (
        <span className="size-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Screen 3 — Deposit
 * -------------------------------------------------------------------------- */

const RAILS = [
  { name: "UPI", meta: "Instant · Recommended", icon: Zap },
  { name: "IMPS", meta: "Instant · 24×7", icon: Landmark },
  { name: "Bank transfer", meta: "NEFT · Same day", icon: Banknote },
];

function DepositScreen() {
  const [rail, setRail] = useState("UPI");
  return (
    <ScreenShell>
      <ModalHeader title="Add money" />
      <div className="flex-1 overflow-hidden px-5">
        <button type="button" className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5 text-left shadow-[0_2px_10px_rgba(20,20,40,.04)]">
          <AnchorMark code="NS" grad={GRAD.purple} size="sm" />
          <span className="flex-1">
            <span className="block text-[9px] uppercase tracking-wide text-subtle">Depositing to</span>
            <span className="block text-[12.5px] font-medium text-ink">NordStern INR</span>
          </span>
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-brand-700">Change <ChevronRight className="size-3" /></span>
        </button>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-subtle">You pay</p>
          <div className="mt-1 flex items-start justify-center">
            <span className="mt-1.5 text-[22px] font-medium text-muted">₹</span>
            <span className="text-[46px] font-semibold leading-none tracking-[-0.04em] text-ink">25,000</span>
          </div>
          <div className="mt-2.5 flex justify-center gap-1.5">
            {["₹10,000", "₹25,000", "₹50,000"].map((v) => (
              <span key={v} className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${v === "₹25,000" ? "bg-ink text-white" : "border border-line bg-white text-muted"}`}>{v}</span>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11px] font-medium text-subtle">Pay with</p>
        <div className="mt-2 space-y-1.5">
          {RAILS.map((item) => {
            const on = rail === item.name;
            const Icon = item.icon;
            return (
              <button key={item.name} type="button" onClick={() => setRail(item.name)} className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${on ? "border-brand-300 bg-brand-50/70" : "border-line bg-white"}`}>
                <span className="grid size-8 place-items-center rounded-xl bg-white text-brand-700 shadow-sm"><Icon className="size-4" /></span>
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-ink">{item.name}</span>
                  <span className="block text-[10px] text-subtle">{item.meta}</span>
                </span>
                <span className={`grid size-[18px] place-items-center rounded-full border ${on ? "border-brand-700" : "border-line"}`}>{on && <span className="size-2.5 rounded-full bg-brand-700" />}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(20,20,40,.04)]">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted">You receive</span>
            <span className="flex items-center gap-1.5 font-semibold text-ink"><CoinLogo coin="usdc" className="size-4" /> 262.60 USDC</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-subtle">
            <span>1 USDC = ₹95.20 · Fee ₹0</span>
            <span className="flex items-center gap-1 text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Rate locked 0:14</span>
          </div>
        </div>
      </div>
      <PrimaryButton hint={<><ShieldCheck className="size-3.5" /> Secured by NordStern</>}>Confirm · ₹25,000</PrimaryButton>
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- *
 * Screen 4 — Wallet
 * -------------------------------------------------------------------------- */

const TXNS = [
  { title: "Deposit · UPI", meta: "Just now", amount: "+262.60", status: "Settled", up: true },
  { title: "Withdraw · HDFC", meta: "Jul 2, 11:04 AM", amount: "−120.00", status: "Completed", up: false },
];

const ASSETS = [
  { coin: "usdc", name: "USD Coin", amount: "1,204.00", fiat: "$1,204.00" },
  { coin: "usdt", name: "Tether", amount: "300.00", fiat: "$300.00" },
] as const;

function WalletScreen() {
  return (
    <ScreenShell>
      <div className="px-5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[19px] font-semibold tracking-tight text-ink">Wallet</h3>
          <span className="relative grid size-9 place-items-center rounded-full bg-white shadow-[0_2px_8px_rgba(20,20,40,.08)]">
            <Bell className="size-4 text-ink" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-600" />
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(150deg,#6f5fd6,#4b3f9e)] p-4 text-white shadow-[0_18px_36px_-18px_rgba(75,63,158,.7)]">
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>Total balance</span>
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px]"><StellarLogo className="size-3" /> Stellar</span>
          </div>
          <p className="mt-1.5 text-[30px] font-semibold tracking-tight">$1,504.00</p>
          <p className="mt-0.5 text-[11px] text-white/70">≈ ₹1,43,181 · <span className="text-emerald-300">+262.60 today</span></p>
          <div className="mt-3 flex gap-2">
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2 text-[11px] font-medium"><Plus className="size-3.5" /> Add</span>
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-[11px] font-medium text-brand-800"><ArrowUpRight className="size-3.5" /> Send</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-hidden px-5">
        <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-1.5">
          <StellarLogo className="size-4" />
          <span className="text-[10.5px] font-medium text-emerald-700">Stellar Network · Operational</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600/80"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Ledger #52,914,203</span>
        </div>

        <span className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-subtle">Assets</span>
        <div className="mt-1.5 space-y-1.5">
          {ASSETS.map((a) => (
            <div key={a.coin} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5 shadow-[0_2px_10px_rgba(20,20,40,.03)]">
              <CoinLogo coin={a.coin} className="size-8" />
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{a.name}</span>
                <span className="flex items-center gap-1 text-[10.5px] text-subtle">{a.coin.toUpperCase()} · <StellarLogo className="size-3" /> Stellar</span>
              </div>
              <div className="text-right">
                <span className="block text-[13px] font-semibold text-ink">{a.amount}</span>
                <span className="block text-[10px] text-subtle">{a.fiat}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">Recent activity</span>
          <span className="text-[11px] text-brand-700">See all</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {TXNS.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 py-2"
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${t.up ? "bg-emerald-50 text-emerald-600" : "bg-surface text-ink"}`}>
                {t.up ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{t.title}</span>
                <span className="block text-[10.5px] text-subtle">{t.meta}</span>
              </span>
              <span className="text-right">
                <span className={`block text-[13px] font-semibold ${t.up ? "text-emerald-600" : "text-ink"}`}>{t.amount}</span>
                <span className="flex items-center justify-end gap-0.5 text-[10px] text-subtle"><CheckCheck className="size-3 text-emerald-500" /> {t.status}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <TabBar active="wallet" />
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- *
 * Screen 5 — Withdraw
 * -------------------------------------------------------------------------- */

function WithdrawScreen() {
  return (
    <ScreenShell>
      <ModalHeader title="Withdraw" />
      <div className="flex-1 overflow-hidden px-5">
        <div className="mt-1 text-center">
          <p className="text-[11px] text-subtle">You withdraw</p>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <CoinLogo coin="usdc" className="size-7" />
            <span className="text-[42px] font-semibold leading-none tracking-[-0.04em] text-ink">120.00</span>
            <span className="text-[16px] font-medium text-muted">USDC</span>
          </div>
          <p className="mt-2 text-[11px] text-subtle">≈ ₹11,424.00 · Balance 1,204.00 USDC</p>
        </div>

        <p className="mt-4 text-[11px] font-medium text-subtle">To account</p>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-3">
          <HdfcLogo className="size-10" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-ink">HDFC Bank</span>
              <BadgeCheck className="size-3.5 text-brand-700" />
            </div>
            <span className="text-[10.5px] text-subtle">Bhavesh S. · Savings •••• 4291</span>
          </div>
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-brand-700">Change <ChevronRight className="size-3" /></span>
        </div>

        <div className="mt-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(20,20,40,.04)]">
          <ReceiptRow icon={<Clock className="size-3.5" />} label="Expected arrival" value="Today, by 4:32 PM" accent />
          <ReceiptRow icon={<Zap className="size-3.5" />} label="Payment rail" value="IMPS · Instant" />
          <ReceiptRow icon={<Banknote className="size-3.5" />} label="Conversion" value="₹95.20 / USDC · Fee ₹0" />
          <ReceiptRow icon={<ShieldCheck className="size-3.5" />} label="Reference" value="NS·8F2KQ9" last />
        </div>
      </div>
      <PrimaryButton hint={<><Fingerprint className="size-3.5" /> Confirm with Face ID</>}>Withdraw · 120.00 USDC</PrimaryButton>
    </ScreenShell>
  );
}

function ReceiptRow({ icon, label, value, accent, last }: { icon: ReactNode; label: string; value: string; accent?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-line"}`}>
      <span className="flex items-center gap-2 text-[11.5px] text-subtle">{icon}{label}</span>
      <span className={`text-[11.5px] font-medium ${accent ? "text-emerald-600" : "text-ink"}`}>{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Floating live notifications — content tracks the active screen so the two
 * cards read as system notifications narrating the same journey.
 * -------------------------------------------------------------------------- */

const NOTES = [
  { icon: BadgeCheck, tint: "text-brand-700 bg-brand-50", title: "Anchor verified", sub: "Regulated INR on-ramp" },
  { icon: ScanFace, tint: "text-emerald-600 bg-emerald-50", title: "Identity verified", sub: "KYC by Didit · reusable" },
  { icon: Landmark, tint: "text-brand-700 bg-brand-50", title: "UPI payment received", sub: "₹25,000.00 · NordStern" },
  { icon: Sparkles, tint: "text-brand-700 bg-brand-50", title: "USDC minted on Stellar", sub: "262.60 USDC · settled" },
  { icon: ArrowUpRight, tint: "text-emerald-600 bg-emerald-50", title: "Withdrawal initiated", sub: "to HDFC •••• 4291" },
];

function NotificationCard({ active }: { active: number }) {
  const note = NOTES[active];
  const Icon = note.icon;
  return (
    <div className="pointer-events-none absolute left-0 top-[18%] z-20 hidden w-56 sm:block">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 rounded-2xl border border-line bg-white/90 p-3 shadow-[0_20px_50px_-24px_rgba(20,20,40,.5)] backdrop-blur"
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${note.tint}`}><Icon className="size-[18px]" /></span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-ink">{note.title}</span>
            <span className="block truncate text-[10.5px] text-subtle">{note.sub}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const DETAILS = [
  { label: "Live settlement", value: "~ 90 sec", tone: "text-brand-700" },
  { label: "Verification", value: "3 / 3 checks", tone: "text-emerald-600" },
  { label: "You receive", value: "262.60 USDC", tone: "text-ink" },
  { label: "Balance", value: "$1,504.00", tone: "text-emerald-600" },
  { label: "Arrives by", value: "4:32 PM · IMPS", tone: "text-brand-700" },
];

function DetailCard({ active }: { active: number }) {
  const d = DETAILS[active];
  return (
    <div className="pointer-events-none absolute bottom-[16%] right-0 z-20 hidden w-52 sm:block">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-line bg-white/90 p-4 shadow-[0_20px_50px_-24px_rgba(20,20,40,.5)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">{d.label}</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <p className={`mt-2 text-[19px] font-semibold tracking-tight ${d.tone}`}>{d.value}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
            <motion.span
              key={active}
              initial={{ width: "12%" }}
              animate={{ width: "88%" }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
              className="block h-full rounded-full bg-brand-600"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
