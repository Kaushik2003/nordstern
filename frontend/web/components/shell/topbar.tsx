"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { toast } from "sonner";
import {
  Search,
  Bell,
  Rows3,
  Rows2,
  IndianRupee,
  Play,
  Pause,
  ChevronDown,
  Building2,
  LogOut,
  BookOpen,
  Settings as SettingsIcon,
  ArrowRightLeft,
  TriangleAlert,
} from "lucide-react";
import { useApp } from "@/lib/providers";
import { useScenario } from "@/lib/scenario";
import { useEventStream, useNow } from "@/lib/hooks";
import { relTime } from "@/lib/format";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { Tip } from "@/components/ui/tooltip";
import { BrandMark } from "@/components/brand/mark";
import { cn } from "@/lib/cn";

export function Topbar() {
  const { setCmdkOpen, format, toggleFormat, density, toggleDensity, env, setEnv } = useApp();
  const scenario = useScenario();

  const runDemo = () => {
    if (scenario.running) {
      scenario.stop();
      toast("Demo ended");
    } else {
      scenario.play();
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-black/[0.05] bg-white/70 px-3 backdrop-blur-xl sm:px-4">
      {/* Brand on mobile (sidebar hidden) */}
      <Link href="/overview" className="md:hidden" aria-label="NordStern">
        <BrandMark size={24} />
      </Link>

      {/* Search / ⌘K */}
      <button
        onClick={() => setCmdkOpen(true)}
        className="group flex h-9 max-w-md flex-1 items-center gap-2.5 rounded-[10px] border border-black/[0.06] bg-white px-3 text-subtle transition-colors hover:border-black/[0.12]"
      >
        <Search className="size-4" />
        <span className="text-[13px]">Search transactions, users, actions…</span>
        <Kbd className="ml-auto hidden sm:inline-grid">⌘K</Kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {/* Environment switcher */}
        <div className="hidden sm:block">
          <Segmented
            size="sm"
            options={[
              { label: "Testnet", value: "testnet" },
              { label: "Mainnet", value: "mainnet" },
            ]}
            value={env}
            onChange={(v) => {
              setEnv(v);
              toast(v === "testnet" ? "Switched to Testnet" : "Switched to Mainnet", {
                description: v === "mainnet" ? "You're now operating on live rails." : undefined,
              });
            }}
          />
        </div>

        {/* Demo */}
        <Tip content={scenario.running ? "End demo" : "Run a scripted demo"}>
          <button
            onClick={runDemo}
            className={cn(
              "hidden h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors lg:inline-flex shadow-xs",
              scenario.running
                ? "border-brand/40 bg-brand-fill text-brand"
                : "border-black/[0.06] bg-white text-muted hover:bg-surface-hover hover:text-ink",
            )}
          >
            {scenario.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {scenario.running ? "Running" : "Run demo"}
          </button>
        </Tip>

        {/* ₹ format */}
        <Tip content={`Numbers: ${format === "full" ? "full" : "compact"} — click to toggle`}>
          <button
            onClick={toggleFormat}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-black/[0.06] bg-white px-3 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink shadow-xs"
          >
            <IndianRupee className="size-3.5" />
            <span className="hidden sm:inline">{format === "full" ? "Full" : "Compact"}</span>
          </button>
        </Tip>

        {/* Density */}
        <Tip content={`Density: ${density} — click to toggle`}>
          <button
            onClick={toggleDensity}
            aria-label="Toggle density"
            className="grid size-9 place-items-center rounded-full border border-black/[0.06] bg-white text-muted transition-colors hover:bg-surface-hover hover:text-ink shadow-xs"
          >
            {density === "compact" ? <Rows3 className="size-4" /> : <Rows2 className="size-4" />}
          </button>
        </Tip>

        <Notifications />
        <OrgMenu />
      </div>
    </header>
  );
}

function Notifications() {
  const events = useEventStream();
  const now = useNow(10_000);
  const alerts = events.filter((e) => e.kind === "alert").slice(0, 6);
  const seed = [
    { id: "s1", at: now - 6 * 60_000, severity: "warn" as const, message: "USDC liquidity covers ~2h at current flow. Top up, or widen the off-ramp spread." },
    { id: "s2", at: now - 48 * 60_000, severity: "warn" as const, message: "Large redemption settled — ₹1,20,000 to a T2 user in Mumbai." },
  ];
  const list = [...alerts.map((a) => ({ id: a.id, at: a.at, severity: a.severity, message: a.message })), ...seed].slice(0, 6);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-full border border-black/[0.06] bg-white text-muted transition-colors hover:bg-surface-hover hover:text-ink shadow-xs">
          <Bell className="size-[17px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-warn ring-2 ring-white" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[340px] origin-top-right rounded-[16px] border border-black/[0.06] bg-white p-1.5 shadow-[0_10px_30px_rgba(24,22,54,0.16)] data-[state=open]:animate-rise"
        >
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="eyebrow">Alerts</span>
            <span className="text-[11px] text-text-tertiary">Reserve · liquidity · payouts</span>
          </div>
          <div className="max-h-[360px] space-y-0.5 overflow-y-auto">
            {list.map((a) => (
              <div key={a.id} className="flex gap-2.5 rounded-[10px] px-2.5 py-2 hover:bg-surface-2">
                <TriangleAlert className={cn("mt-0.5 size-4 shrink-0", a.severity === "crit" ? "text-crit" : "text-warn")} />
                <div className="min-w-0">
                  <p className="text-[12.5px] leading-snug text-text-primary">{a.message}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-text-tertiary">{relTime(a.at, now)}</p>
                </div>
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function OrgMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white pl-1.5 pr-2.5 transition-colors hover:bg-surface-hover shadow-xs">
          <span className="grid size-6 place-items-center rounded-full bg-brand-fill text-[11px] font-semibold text-brand">AP</span>
          <span className="hidden text-[13px] font-medium text-text-primary sm:inline">Acme Pay</span>
          <ChevronDown className="size-3.5 text-text-tertiary" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-[16px] border border-black/[0.06] bg-white p-1.5 shadow-[0_10px_30px_rgba(24,22,54,0.16)] data-[state=open]:animate-rise"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="grid size-9 place-items-center rounded-[9px] bg-brand-fill text-[13px] font-semibold text-brand">AP</span>
            <div>
              <div className="text-[13px] font-semibold text-text-primary">Acme Pay</div>
              <div className="font-mono text-[10.5px] text-text-tertiary">acmepay.in · INRT</div>
            </div>
          </div>
          <Sep />
          <Item icon={ArrowRightLeft}>Switch organization</Item>
          <LinkItem icon={SettingsIcon} href="/settings">Settings & team</LinkItem>
          <LinkItem icon={BookOpen} href="/developer">Documentation</LinkItem>
          <Sep />
          <Item icon={LogOut} tone="crit">Sign out</Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Sep() {
  return <DropdownMenu.Separator className="my-1 h-px bg-black/[0.06]" />;
}
function Item({ icon: Icon, children, tone }: { icon: typeof Building2; children: React.ReactNode; tone?: "crit" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] outline-none",
        tone === "crit" ? "text-crit data-[highlighted]:bg-crit-fill" : "text-text-secondary data-[highlighted]:bg-surface-2 data-[highlighted]:text-text-primary",
      )}
    >
      <Icon className="size-4" />
      {children}
    </DropdownMenu.Item>
  );
}
function LinkItem({ icon: Icon, href, children }: { icon: typeof Building2; href: string; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-text-secondary outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-text-primary"
      >
        <Icon className="size-4" />
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
