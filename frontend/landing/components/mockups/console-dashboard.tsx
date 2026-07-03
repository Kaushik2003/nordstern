import { cn } from "@/lib/cn";
import {
  Grid,
  Bank,
  Bolt,
  Shield,
  Users,
  Gear,
  Code,
  Book,
  Check,
  Search,
  Bell,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "@/components/ui/icons";

export type ConsoleView = "overview" | "treasury" | "pricing";

/* ------------------------------------------------------------------ *
 * Load-in choreography. The hero lifts the whole card in (~1.2–2.4s);
 * these delays cascade the interior content afterwards, landing at ~6s.
 * `backwards` fill hides each element until its turn, then releases the
 * transform so hover interactions still work.
 * ------------------------------------------------------------------ */
const EASE = "cubic-bezier(0.22,1,0.36,1)";
const reveal = (delay: number): React.CSSProperties => ({
  animation: `console-reveal 0.62s ${EASE} ${delay}s backwards`,
});
const draw = (delay: number): React.CSSProperties => ({
  animation: `console-draw 1.4s ease-out ${delay}s both`,
});

const T = {
  header: 2.5,
  kpi: 2.68,
  kpiStep: 0.11,
  moneyCard: 3.25,
  chart: 3.7,
  txCard: 3.6,
  txRow: 3.98,
  txStep: 0.11,
  attnCard: 4.15,
  attnRow: 4.5,
  attnStep: 0.1,
  resCard: 4.45,
  resRow: 4.78,
  resStep: 0.1,
  healthCard: 4.75,
  healthRow: 4.98,
  healthStep: 0.08,
};

/* --------------------------------- system --------------------------------- */
const CARD =
  "rounded-[20px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(24,22,54,0.04),0_10px_30px_-20px_rgba(24,22,54,0.16)]";
const CARD_HOVER =
  "transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgba(24,22,54,0.05),0_22px_48px_-24px_rgba(34,24,78,0.24)]";
const INK = "text-[#1c1b26]"; // deep charcoal, never pure black

function Card({
  className,
  hover,
  style,
  children,
}: {
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={style} className={cn(CARD, hover && CARD_HOVER, "p-5", className)}>
      {children}
    </div>
  );
}

/* --------------------------------- chrome --------------------------------- */
/** Left rail — the seven surfaces, with a soft purple active state. */
function Rail() {
  const items = [Grid, Bolt, Bank, Users, Shield, Code];
  return (
    <div className="hidden w-[68px] shrink-0 flex-col items-center justify-between bg-[#161520] py-6 sm:flex">
      <div className="flex flex-col items-center gap-2">
        <img
          src="/logo-light.png"
          alt="NordStern"
          className="mb-3 size-9 object-contain"
        />
        {items.map((Icon, i) => (
          <span
            key={i}
            className={cn(
              "grid size-10 place-items-center rounded-[13px] text-[18px] transition-colors duration-200",
              i === 0
                ? "bg-brand/[0.16] text-white ring-1 ring-inset ring-brand/20"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/80",
            )}
          >
            <Icon />
          </span>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="grid size-10 place-items-center rounded-[13px] text-[18px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80">
          <Book />
        </span>
        <span className="grid size-10 place-items-center rounded-[13px] text-[18px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80">
          <Gear />
        </span>
        <span className="my-1 h-px w-6 rounded-full bg-white/10" />
        <span className="size-8 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 ring-1 ring-white/15" />
      </div>
    </div>
  );
}

/** Top bar — anchor brand, environment, network, and operator controls. */
function Topbar() {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.05] px-6 py-4">
      <div className="flex items-center gap-1.5 text-[15px] font-semibold">
        <span className="italic tracking-tight">Kori</span>
        <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold not-italic tracking-wide text-brand-800">
          PAY
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6eccf] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#8a6410]">
        <span className="size-1.5 rounded-full bg-[#c9992e]" /> TESTNET
      </span>
      <span className="hidden rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 text-[10px] font-medium text-muted sm:inline">
        Stellar · INRx
      </span>
      <div className="ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-[12.5px] text-subtle lg:flex">
          <Search className="text-[15px]" /> Search transactions, memos…
        </span>
        <span className="grid size-9 place-items-center rounded-full border border-black/[0.06] bg-white text-muted transition-colors hover:text-ink">
          <Bell className="text-[15px]" />
        </span>
        <span className="size-8 rounded-full bg-gradient-to-br from-brand-200 to-brand-300 ring-1 ring-black/[0.06]" />
      </div>
    </div>
  );
}

/* --------------------------------- pieces --------------------------------- */
function Kpi({
  label,
  value,
  sub,
  accent,
  delta,
  style,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  delta?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card hover style={style}>
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-medium text-muted">{label}</p>
        {delta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-up)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-up)]">
            {delta}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3.5 text-[27px] font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[29px]",
          accent ? "text-[color:var(--color-up)]" : INK,
        )}
      >
        {value}
      </p>
      <p className="mt-2.5 text-[11.5px] text-subtle">{sub}</p>
    </Card>
  );
}

function PanelHead({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className={cn("text-[13.5px] font-medium", INK)}>{title}</p>
      {meta}
    </div>
  );
}

/** SEP transaction lifecycle status — state carries the only color. */
type StatusKind = "completed" | "progress" | "review" | "failed";
const STATUS: Record<StatusKind, { cls: string; dot: string }> = {
  completed: {
    cls: "bg-[color:var(--color-up)]/10 text-[color:var(--color-up)]",
    dot: "bg-[color:var(--color-up)]",
  },
  progress: { cls: "bg-brand/[0.12] text-brand-800", dot: "bg-brand-700" },
  review: { cls: "bg-[#f6eccf] text-[#8a6410]", dot: "bg-[#c9992e]" },
  failed: {
    cls: "bg-[color:var(--color-down)]/10 text-[color:var(--color-down)]",
    dot: "bg-[color:var(--color-down)]",
  },
};

function Status({ kind, label }: { kind: StatusKind; label: string }) {
  const s = STATUS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium",
        s.cls,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {label}
    </span>
  );
}

function TxRow({
  name,
  meta,
  dir,
  method,
  amount,
  status,
  statusLabel,
  age,
  style,
}: {
  name: string;
  meta: string;
  dir: "in" | "out";
  method: string;
  amount: string;
  status: StatusKind;
  statusLabel: string;
  age: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="group -mx-5 flex items-center gap-3 rounded-xl px-5 py-3 transition-colors duration-200 hover:bg-[#faf9fe]"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full text-[15px]",
          dir === "in"
            ? "bg-[color:var(--color-up)]/10 text-[color:var(--color-up)]"
            : "bg-surface-2 text-muted",
        )}
      >
        {dir === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-medium", INK)}>{name}</p>
        <p className="truncate text-[11.5px] text-subtle">{meta}</p>
      </div>
      <span className="hidden rounded-full border border-black/[0.05] bg-surface px-2.5 py-0.5 text-[10.5px] font-medium text-muted sm:inline">
        {method}
      </span>
      <span
        className={cn(
          "w-24 shrink-0 text-right text-[13px] font-medium tabular-nums",
          dir === "in" ? "text-[color:var(--color-up)]" : INK,
        )}
      >
        {amount}
      </span>
      <span className="hidden w-36 shrink-0 md:block">
        <Status kind={status} label={statusLabel} />
      </span>
      <span className="hidden w-8 shrink-0 text-right text-[11px] text-subtle tabular-nums lg:inline">
        {age}
      </span>
    </div>
  );
}

function QueueRow({
  Icon,
  tone,
  label,
  meta,
  value,
  style,
}: {
  Icon: typeof Grid;
  tone: "info" | "warn" | "down";
  label: string;
  meta: string;
  value: string;
  style?: React.CSSProperties;
}) {
  const tones = {
    info: "bg-brand/[0.12] text-brand-800",
    warn: "bg-[#f6eccf] text-[#8a6410]",
    down: "bg-[color:var(--color-down)]/10 text-[color:var(--color-down)]",
  };
  return (
    <div
      style={style}
      className="group -mx-5 flex items-center gap-3 rounded-xl px-5 py-2.5 transition-colors duration-200 hover:bg-[#faf9fe]"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[11px] text-[15px]",
          tones[tone],
        )}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-medium", INK)}>{label}</p>
        <p className="truncate text-[11.5px] text-subtle tabular-nums">{meta}</p>
      </div>
      <span className={cn("text-[13px] font-semibold tabular-nums", INK)}>{value}</span>
      <ChevronRight className="text-[15px] text-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
    </div>
  );
}

function AcctRow({
  name,
  meta,
  badge,
  badgeClass,
  value,
  style,
}: {
  name: string;
  meta: string;
  badge: string;
  badgeClass: string;
  value: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-medium", INK)}>{name}</p>
        <p className="truncate font-mono text-[10px] text-subtle">{meta}</p>
      </div>
      <span
        className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-bold", badgeClass)}
      >
        {badge}
      </span>
      <span className={cn("w-28 text-right text-[13px] font-medium tabular-nums", INK)}>
        {value}
      </span>
    </div>
  );
}

function HealthRow({
  ok,
  name,
  status,
  style,
}: {
  ok: boolean;
  name: string;
  status: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="flex items-center gap-2.5 py-2 text-[12px]">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          ok ? "bg-[color:var(--color-up)]" : "bg-[#c9992e]",
        )}
      />
      <span className="flex-1 text-muted">{name}</span>
      <span
        className={cn(
          "font-mono text-[10px]",
          ok ? "text-[color:var(--color-up)]" : "text-[#8a6410]",
        )}
      >
        {status}
      </span>
    </div>
  );
}

/** Soft brand area chart — faint grid, gradient fill, drawn-in stroke. */
function FlowChart() {
  const line =
    "M4,66 C30,60 46,58 64,54 C92,48 108,50 130,42 C156,33 172,40 196,32 C224,22 244,26 270,16 C282,12 292,12 296,10";
  return (
    <svg
      viewBox="0 0 300 88"
      preserveAspectRatio="none"
      className="h-28 w-full"
      aria-hidden
    >
      {[26, 52, 78].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="300"
          y2={y}
          stroke="#1c1b26"
          strokeOpacity={0.05}
        />
      ))}
      <path d={`${line} L296,88 L4,88 Z`} fill="url(#ns-flow)" opacity={0.9} />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="var(--color-brand-700)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={1}
        style={draw(T.chart)}
      />
      <circle cx="296" cy="10" r="6" fill="var(--color-brand-700)" opacity={0.14} />
      <circle cx="296" cy="10" r="3" fill="var(--color-brand-700)" />
      <defs>
        <linearGradient id="ns-flow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand)" stopOpacity={0.26} />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* --------------------------------- views ---------------------------------- */
function Overview() {
  const txs: Omit<React.ComponentProps<typeof TxRow>, "style">[] = [
    { name: "Priya Sharma", meta: "on-ramp · tx_8f2a", dir: "in", method: "UPI", amount: "+₹42,000", status: "completed", statusLabel: "Completed", age: "2m" },
    { name: "Rahul Mehta", meta: "off-ramp · tx_8f19", dir: "out", method: "IMPS", amount: "−₹17,900", status: "failed", statusLabel: "Payout failed", age: "6m" },
    { name: "Sunrise Payroll Pvt Ltd", meta: "on-ramp · tx_8f04", dir: "in", method: "NEFT", amount: "+₹1,28,600", status: "progress", statusLabel: "Asset issued", age: "14m" },
    { name: "Vendor Co.", meta: "off-ramp · tx_8ef7", dir: "out", method: "RTGS", amount: "−₹3,40,000", status: "progress", statusLabel: "Payout queued", age: "22m" },
    { name: "Sana Khan", meta: "on-ramp · tx_8ee0", dir: "in", method: "UPI", amount: "+₹5,000", status: "review", statusLabel: "KYC review", age: "31m" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between" style={reveal(T.header)}>
        <p className={cn("text-[15px] font-semibold", INK)}>Overview</p>
        <p className="text-[11.5px] text-subtle">Updated 40s ago · testnet</p>
      </div>

      {/* KPI row — the anchor's balance sheet at a glance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi style={reveal(T.kpi)} label="Tokens in circulation" value="1,02,00,400" sub="INRx · issued liability" />
        <Kpi style={reveal(T.kpi + T.kpiStep)} label="Fiat reserve" value="₹1,03,45,900" sub="nodal · HDFC ••2298" />
        <Kpi style={reveal(T.kpi + T.kpiStep * 2)} label="Reserve ratio" value="101.4%" sub="fully backed · ≥ 100%" accent delta="backed" />
        <Kpi style={reveal(T.kpi + T.kpiStep * 3)} label="Net flow · 24h" value="+₹18.4L" sub="in ₹42.1L · out ₹23.7L" delta="▲ 12%" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* left — money movement + transactions */}
        <div className="space-y-5">
          <Card hover style={reveal(T.moneyCard)}>
            <PanelHead
              title="Money movement"
              meta={<p className="text-[11.5px] text-subtle">Last 14 days</p>}
            />
            <div className="mb-4 flex gap-7">
              <div>
                <p className="text-[11.5px] text-subtle">On-ramp</p>
                <p className="mt-1 text-[17px] font-medium tabular-nums text-[color:var(--color-up)]">₹5.42 Cr</p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Off-ramp</p>
                <p className={cn("mt-1 text-[17px] font-medium tabular-nums", INK)}>₹4.03 Cr</p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Settled · avg</p>
                <p className={cn("mt-1 text-[17px] font-medium tabular-nums", INK)}>~2 min</p>
              </div>
            </div>
            <FlowChart />
          </Card>

          <Card style={reveal(T.txCard)}>
            <PanelHead
              title="Recent transactions"
              meta={<p className="text-[11.5px] font-medium text-brand-700">View all →</p>}
            />
            <div>
              {txs.map((t, i) => (
                <TxRow key={t.meta} {...t} style={reveal(T.txRow + i * T.txStep)} />
              ))}
            </div>
          </Card>
        </div>

        {/* right — attention, reserves, health */}
        <div className="space-y-5">
          <Card style={reveal(T.attnCard)}>
            <PanelHead
              title="Needs attention"
              meta={<p className="text-[11.5px] text-subtle">21 items</p>}
            />
            <QueueRow style={reveal(T.attnRow)} Icon={ArrowUpRight} tone="info" label="Withdrawals awaiting payout" meta="oldest 22m · SLA 30m" value="₹4,20,000" />
            <QueueRow style={reveal(T.attnRow + T.attnStep)} Icon={ArrowDownLeft} tone="info" label="Deposits pending" meta="3 transactions" value="₹96,000" />
            <QueueRow style={reveal(T.attnRow + T.attnStep * 2)} Icon={Users} tone="warn" label="KYC review required" meta="5 customers · 1 flagged" value="5" />
            <QueueRow style={reveal(T.attnRow + T.attnStep * 3)} Icon={ArrowUpRight} tone="down" label="Payout failed · retry" meta="tx_8f19 · beneficiary IFSC" value="₹17,900" />
          </Card>

          <Card style={reveal(T.resCard)}>
            <PanelHead title="Reserve accounts" />
            <AcctRow style={reveal(T.resRow)} name="Bank nodal · HDFC" meta="A/C ••2298 · HDFC0001435" badge="INR" badgeClass="bg-[color:var(--color-up)]/10 text-[color:var(--color-up)]" value="₹1,03,45,900" />
            <AcctRow style={reveal(T.resRow + T.resStep)} name="Stellar distribution" meta="GA…X29 · issues INRx" badge="XLM" badgeClass="bg-brand/[0.12] text-brand-800" value="1,02,00,400" />
            <AcctRow style={reveal(T.resRow + T.resStep * 2)} name="Issuer account" meta="GB…7QF · asset control" badge="XLM" badgeClass="bg-brand/[0.12] text-brand-800" value="—" />
          </Card>

          <Card style={reveal(T.healthCard)}>
            <PanelHead
              title="System & providers"
              meta={<p className="font-mono text-[10px] text-[color:var(--color-up)]">Operational</p>}
            />
            {[
              { ok: true, name: "Anchor Platform · SEP", status: "healthy" },
              { ok: true, name: "Horizon · testnet", status: "ledger 1.2M" },
              { ok: true, name: "RazorpayX · payouts", status: "healthy" },
              { ok: true, name: "Razorpay · UPI", status: "healthy" },
              { ok: false, name: "HyperVerge · KYC", status: "degraded" },
              { ok: true, name: "Webhooks · 24h", status: "1,204 sent" },
            ].map((h, i) => (
              <HealthRow key={h.name} {...h} style={reveal(T.healthRow + i * T.healthStep)} />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Treasury() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl bg-brand-100 px-4 py-3 text-center text-[13px] font-medium text-brand-800">
          Reserve ratio holding at <b>101.4%</b> — every INRx fully backed
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(20,20,43,0.05)] ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-[11px] font-medium text-white">
              1
            </span>
            <p className="text-[13px] font-medium">Top up settlement float</p>
            <span className="ml-auto rounded-md border border-brand px-3 py-1 text-[13px] font-medium tabular-nums">
              ₹20,00,000
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 text-[11px] text-subtle">
            <span>₹10L</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-surface-2">
              <div className="h-full w-2/5 rounded-full bg-ink" />
              <span className="absolute left-2/5 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-black/10" />
            </div>
            <span>₹50L</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(20,20,43,0.05)] ring-1 ring-black/[0.04]">
          <div className="flex items-center gap-3">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-[11px] font-medium text-white">
              2
            </span>
            <p className="text-[13px] font-medium">Nodal account</p>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-[13px]">
            <span className="font-medium">HDFC · Current</span>
            <span className="text-subtle">•••• 1435</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 p-5 text-center">
        <span className="mx-auto grid size-8 place-items-center rounded-full bg-white text-[color:var(--color-up)] shadow-sm">
          <Check className="text-sm" />
        </span>
        <p className="mt-3 text-[12px] text-brand-800">Float settled</p>
        <p className="text-[26px] font-medium tracking-tight text-ink">₹20,00,000</p>
        <p className="mt-1 text-[11px] text-brand-800/70">Confirmed in ~2 min</p>
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(20,20,43,0.05)] ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium">Spread schedule</p>
        <span className="rounded-pill bg-brand-100 px-2.5 py-1 text-[11px] font-medium text-brand-800">
          Live
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          { t: "On-ramp", v: "0.90%" },
          { t: "Off-ramp", v: "1.10%" },
          { t: "Net margin", v: "0.42%" },
        ].map((c) => (
          <div key={c.t} className="rounded-lg bg-surface p-3">
            <p className="text-[11px] text-subtle">{c.t}</p>
            <p className="mt-1 text-[17px] font-medium tracking-tight">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-24 items-end gap-1.5">
        {[40, 55, 48, 62, 70, 58, 75, 82, 68, 88].map((h, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-t", i === 9 ? "bg-brand" : "bg-brand-200")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-[color:var(--color-up)]">
        <Check className="text-sm" /> Backtest: +3.1% margin vs last schedule
      </div>
    </div>
  );
}

const VIEWS: Record<ConsoleView, () => React.ReactElement> = {
  overview: Overview,
  treasury: Treasury,
  pricing: Pricing,
};

/**
 * Stylized NordStern anchor operator console. The hero renders the Overview —
 * a dark left rail, brand/environment top bar, and a soft floating card system
 * (reserve backing, SEP transaction lifecycle, exception queues, reserve
 * accounts, provider health) that cascades in on load. Testnet throughout.
 */
export function ConsoleDashboard({ view }: { view: ConsoleView }) {
  const ViewBody = VIEWS[view];
  return (
    <div className="flex w-full overflow-hidden rounded-[28px] border border-black/[0.06] bg-[#f4f4f8] shadow-[0_40px_120px_-52px_rgba(50,42,110,0.42)]">
      <Rail />
      <div className="min-w-0 flex-1 bg-[radial-gradient(130%_100%_at_50%_-20%,#faf9ff_0%,#f5f5f9_55%,#f1f0f6_100%)]">
        <Topbar />
        <div className="p-5 sm:p-6">
          <ViewBody />
        </div>
      </div>
    </div>
  );
}
