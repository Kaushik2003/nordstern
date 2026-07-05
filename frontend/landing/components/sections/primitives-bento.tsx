import type { ReactNode } from "react";
import { Bell, Check, ChevronDown, Search, ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/typography";
import { PRIMITIVES } from "@/lib/content";
import { cn } from "@/lib/cn";

/**
 * Capability bento — masonry layout with mixed card sizes and alternating
 * light / deep-purple tones, each carrying an editorial heading and a static
 * illustration (phone, console panel, asset cards, badge, sealed card, donut).
 * Static by design: the visuals support the copy, they don't animate.
 */
type Tone = "light" | "tint" | "dark";

const LAYOUT: Record<string, { span: string; tone: Tone }> = {
  users: { span: "md:col-span-4 md:row-span-2", tone: "light" },
  businesses: { span: "md:col-span-8", tone: "tint" },
  compliance: { span: "md:col-span-5", tone: "dark" },
  identity: { span: "md:col-span-3", tone: "tint" },
  developers: { span: "md:col-span-12", tone: "dark" },
};

const TONE_CLASS: Record<Tone, string> = {
  light: "bg-surface text-ink border border-line",
  tint: "bg-brand-50 text-ink border border-brand-100",
  dark: "bg-[linear-gradient(150deg,#2A2342,#1A152C)] text-white border border-brand-900/30",
};

export function PrimitivesBento() {
  return (
    <Section id="platform" tone="canvas">
      <SectionHeader title={PRIMITIVES.title} lead={PRIMITIVES.lead} className="max-w-2xl" />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-12 md:grid-rows-[auto_auto_auto]">
        {PRIMITIVES.items.map((item) => {
          const layoutInfo = LAYOUT[item.id] || { span: "md:col-span-4", tone: "light" };
          const { span, tone } = layoutInfo;
          const renderer = CARDS[item.id];
          if (!renderer) return null;
          return (
            <article
              key={item.id}
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 sm:p-7 min-h-[340px]",
                TONE_CLASS[tone],
                span,
              )}
            >
              {renderer({ title: item.title, caption: item.caption, dark: tone === "dark" })}
            </article>
          );
        })}
      </div>
    </Section>
  );
}

type CardProps = { title: string; caption: string; dark: boolean };

function Heading({ title, caption, dark }: CardProps) {
  return (
    <div>
      <h3 className="text-[clamp(1.5rem,2.2vw,2rem)] font-normal leading-[1.05] tracking-[-0.02em]">{title}</h3>
      <p className={cn("mt-2.5 max-w-xl text-sm leading-relaxed", dark ? "text-white/70" : "text-muted")}>{caption}</p>
    </div>
  );
}

const CARDS: Record<string, (p: CardProps) => ReactNode> = {
  /* Users — Tall card on the left: App flow with phone mockup */
  users: (p) => (
    <>
      <Heading {...p} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-16 justify-center">
        <RailsPhone />
      </div>
    </>
  ),

  /* Businesses — B2B console panel */
  businesses: (p) => (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center md:h-full w-full">
      <div className="md:max-w-[48%]">
        <Heading {...p} />
      </div>
      <div className="flex items-center justify-center md:justify-end flex-1 w-full">
        <ConsolePanel />
      </div>
    </div>
  ),

  /* Compliance — audit log and sealing checks */
  compliance: (p) => (
    <div className="flex flex-col justify-between gap-6 h-full w-full">
      <Heading {...p} />
      <div className="mt-auto flex justify-center w-full">
        <SealedCard />
      </div>
    </div>
  ),

  /* Identity — KYC verified badge */
  identity: (p) => (
    <div className="flex flex-col justify-between gap-6 h-full w-full">
      <Heading {...p} />
      <div className="mt-auto w-full">
        <IdentityBadge />
      </div>
    </div>
  ),

  /* Developers — SDK code terminal full-width split card */
  developers: (p) => (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center md:h-full w-full">
      <div className="md:max-w-[48%]">
        <Heading {...p} />
      </div>
      <div className="flex-1 w-full max-w-[480px]">
        <MiniTerminal />
      </div>
    </div>
  ),
};

/* -------------------------------------------------------------------------- *
 * Illustrations
 * -------------------------------------------------------------------------- */

function UsdcMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path fill="#fff" d="M20.02 18.12c0-2.12-1.28-2.85-3.84-3.15-1.83-.25-2.19-.73-2.19-1.58s.61-1.4 1.83-1.4c1.1 0 1.7.37 2.01 1.28.06.18.24.3.43.3h.97c.24 0 .43-.18.43-.42v-.06a3.04 3.04 0 00-2.74-2.49V9.14c0-.24-.18-.42-.49-.48h-.91c-.24 0-.43.18-.49.48v1.4c-1.83.24-2.99 1.46-2.99 2.97 0 2 1.22 2.79 3.78 3.1 1.71.3 2.26.67 2.26 1.64 0 .97-.85 1.64-2.01 1.64-1.59 0-2.13-.67-2.32-1.58-.06-.24-.24-.36-.43-.36h-1.03a.42.42 0 00-.43.42v.06c.24 1.52 1.22 2.61 3.23 2.91v1.46c0 .24.18.42.49.49h.91c.24 0 .43-.18.49-.49v-1.46c1.83-.3 3.05-1.58 3.05-3.22z" />
      <path fill="#fff" d="M12.89 24.82c-4.75-1.7-7.19-6.99-5.42-11.67.91-2.55 2.92-4.49 5.42-5.4.24-.12.36-.3.36-.61v-.85c0-.24-.12-.42-.36-.48-.06 0-.18 0-.24.06a10.9 10.9 0 00-7.13 13.74c1.1 3.4 3.72 6.01 7.13 7.1.24.12.49 0 .55-.24.06-.06.06-.12.06-.24v-.85c0-.18-.18-.42-.37-.55zm6.46-19.26c-.24-.12-.49 0-.55.24-.06.06-.06.12-.06.24v.85c0 .24.18.49.36.61 4.75 1.7 7.19 6.99 5.42 11.67-.91 2.55-2.92 4.49-5.42 5.4-.24.12-.36.3-.36.61v.85c0 .24.12.42.36.49.06 0 .18 0 .24-.06a10.9 10.9 0 007.13-13.74c-1.1-3.46-3.78-6.07-7.13-7.16z" />
    </svg>
  );
}

/* Rails — a full phone device frame showing deposit → mint */
function RailsPhone() {
  return (
    <div className="w-[310px] h-[560px] rounded-[2.4rem] bg-[#151519] p-3 shadow-[0_20px_50px_-20px_rgba(30,25,70,0.35)] border border-white/5 flex flex-col">
      <div className="flex-1 overflow-hidden rounded-[1.9rem] bg-white flex flex-col justify-between">
        <div className="px-6">
          <div className="flex items-center justify-between pb-1 pt-4 text-[11px] font-semibold text-ink">
            <span>9:41</span>
            <span className="flex gap-1.5"><span className="size-2 rounded-full bg-ink/70" /><span className="size-2 rounded-full bg-ink/70" /></span>
          </div>
          <div className="pt-4">
            <p className="text-[13px] text-subtle">Deposit received</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[16px] text-muted">₹</span>
              <span className="text-[36px] font-semibold tracking-tight text-ink">25,000</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["UPI", "IMPS", "NEFT", "RTGS"].map((r, i) => (
                <span
                  key={r}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    i === 0 ? "bg-brand-600 text-white" : "bg-surface text-subtle",
                  )}
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-brand-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted">Minted to</span>
                <UsdcMark className="size-5" />
              </div>
              <p className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">262.60 USDC</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <Check className="size-3" strokeWidth={3} /> Settled on Stellar
              </p>
            </div>
            
            {/* Transaction metadata list */}
            <div className="mt-6 border-t border-line/60 pt-5 space-y-3">
              <p className="text-[10px] font-bold text-ink uppercase tracking-wider">Transaction Details</p>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-subtle">Payment method</span>
                <span className="font-medium text-ink">UPI (GPay)</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-subtle">Exchange rate</span>
                <span className="font-medium text-ink">₹95.20 per USDC</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-subtle">Network fee</span>
                <span className="font-medium text-emerald-600">0.00 USDC (Sponsored)</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-subtle">Stellar Tx</span>
                <span className="font-mono text-[10.5px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">0x3a9f...b4c2</span>
              </div>
            </div>
          </div>
        </div>
        {/* iOS Home Indicator Bar */}
        <div className="w-full flex justify-center pb-3 pt-3">
          <div className="w-28 h-1 rounded-full bg-zinc-300" />
        </div>
      </div>
    </div>
  );
}

/* Console — a dashboard panel with a reserves overlay */
function ConsolePanel() {
  return (
    <div className="relative w-full max-w-[320px] shrink-0">
      <div className="rounded-3xl border border-line bg-white p-4 shadow-[0_20px_50px_-28px_rgba(30,25,70,.4)]">
        <div className="flex items-center justify-between">
          <span className="grid size-7 place-items-center rounded-full bg-surface text-subtle"><Search className="size-3.5" /></span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-ink">Treasury <ChevronDown className="size-3 text-subtle" /></span>
          <span className="grid size-7 place-items-center rounded-full bg-surface text-subtle"><Bell className="size-3.5" /></span>
        </div>
        <p className="mt-4 text-[10px] text-subtle">Total balance</p>
        <p className="text-[26px] font-semibold tracking-tight text-ink">$1,254,768</p>
      </div>
      <div className="absolute -bottom-3 left-4 right-4 rounded-2xl bg-[linear-gradient(150deg,#5a4bb8,#3d3382)] p-3.5 text-white shadow-[0_18px_36px_-16px_rgba(61,51,130,.7)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/70">Reserves · 1:1 backed</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px]">+0.0%</span>
        </div>
        <p className="mt-1 text-[18px] font-semibold tracking-tight">$1,254,768</p>
      </div>
    </div>
  );
}

/* Settlement — floating asset cards (USDC + INR) */
function AssetCards() {
  return (
    <div className="relative h-[168px] w-full max-w-[240px] shrink-0">
      <div className="absolute right-4 top-0 w-[190px] rotate-[5deg] rounded-2xl bg-white p-3.5 shadow-[0_18px_40px_-18px_rgba(20,20,40,.5)]">
        <div className="flex items-center gap-2">
          <UsdcMark className="size-6" />
          <span className="text-[11px] font-medium text-ink">USDC · Stellar</span>
        </div>
        <p className="mt-2 text-[18px] font-semibold tracking-tight text-ink">262.60 USDC</p>
      </div>
      <div className="absolute bottom-0 left-0 w-[190px] -rotate-[4deg] rounded-2xl bg-white p-3.5 shadow-[0_18px_40px_-18px_rgba(20,20,40,.5)]">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">₹</span>
          <span className="text-[11px] font-medium text-ink">INR deposit</span>
        </div>
        <p className="mt-2 text-[18px] font-semibold tracking-tight text-ink">₹25,000.00</p>
      </div>
    </div>
  );
}

/* Identity — KYC badge */
function IdentityBadge() {
  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-[0_12px_30px_-18px_rgba(20,20,40,.4)]">
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="grid size-11 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">BS</span>
          <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Identity verified</p>
          <p className="text-[10.5px] text-subtle">Document · liveness · face</p>
        </div>
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10.5px] font-medium text-brand-800">
        <ShieldCheck className="size-3 text-brand-700" /> Powered by <span className="font-semibold text-ink">Didit</span>
      </span>
    </div>
  );
}

/* Compliance — a "sealed" audit card on the dark surface */
function SealedCard() {
  return (
    <div className="w-full max-w-[240px] shrink-0 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
      <div className="flex items-center gap-2 text-white">
        <span className="grid size-8 place-items-center rounded-xl bg-white/15"><ShieldCheck className="size-4" /></span>
        <span className="text-[12px] font-medium">Transaction sealed</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          ["Sanctions", "clear"],
          ["Monitoring", "ok"],
          ["Audit hash", "0x9f2a…"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[10.5px]">
            <span className="flex items-center gap-1.5 text-white/70">
              <Check className="size-3 text-emerald-300" strokeWidth={3} /> {k}
            </span>
            <span className="font-mono text-white/90">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* MiniTerminal — developer SDK code terminal mock */
function MiniTerminal() {
  return (
    <div className="w-full rounded-2xl bg-zinc-950/80 p-4 font-mono text-[11px] sm:text-[12px] leading-relaxed text-zinc-300 border border-white/10 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-1.5 pb-3">
        <span className="size-2 rounded-full bg-red-500/80" />
        <span className="size-2 rounded-full bg-yellow-500/80" />
        <span className="size-2 rounded-full bg-green-500/80" />
      </div>
      <div className="space-y-1 select-none">
        <p className="text-zinc-500">// Initialize client</p>
        <p><span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> <span className="text-yellow-300">NordStern</span>();</p>
        <p className="text-zinc-500">// Start interactive ramp</p>
        <p><span className="text-purple-400">const</span> tx = <span className="text-purple-400">await</span> client.<span className="text-blue-400">deposit</span>({"{"}</p>
        <p className="pl-4">amount: <span className="text-emerald-400">&quot;25000.00&quot;</span>,</p>
        <p className="pl-4">rail: <span className="text-emerald-400">&quot;upi&quot;</span></p>
        <p>{"});"}</p>
      </div>
    </div>
  );
}
