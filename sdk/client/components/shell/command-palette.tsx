"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Banknote,
  Download,
  Rows3,
  IndianRupee,
  Play,
  ServerCog,
  CornerDownLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/dialog";
import { useApp } from "@/lib/providers";
import { useScenario } from "@/lib/scenario";
import { ALL_NAV } from "@/lib/nav";
import { users, transactions } from "@/lib/data/store";
import { truncHash, inr } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";

export function CommandPalette() {
  const { cmdkOpen, setCmdkOpen, toggleEnv, toggleDensity, toggleFormat } = useApp();
  const scenario = useScenario();
  const router = useRouter();

  const go = (href: string) => {
    router.push(href);
    setCmdkOpen(false);
  };
  const run = (fn: () => void) => {
    fn();
    setCmdkOpen(false);
  };

  const topUsers = users.slice(0, 6);
  const recentTx = transactions.slice(0, 6);

  return (
    <Modal open={cmdkOpen} onOpenChange={setCmdkOpen} align="top" size="lg" title="Command palette" className="overflow-hidden p-0">
      <Command label="Command palette" className="flex max-h-[60vh] flex-col">
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-4">
          <ArrowUpRight className="size-4 shrink-0 text-text-tertiary" />
          <Command.Input
            autoFocus
            placeholder="Search pages, actions, users, transactions…"
            className="h-12 w-full bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <Kbd>esc</Kbd>
        </div>
        <Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-[13px] text-text-tertiary">
            No matches. Try “withdraw”, a name, or a hash.
          </Command.Empty>

          <Group heading="Actions">
            <Row icon={Banknote} onSelect={() => go("/treasury?withdraw=1")} keywords="withdraw funds money corporate bank payout">
              Withdraw to corporate account
              <Hint>Treasury</Hint>
            </Row>
            <Row icon={Download} onSelect={() => run(() => toast("Export started", { description: "This month · CSV will download." }))} keywords="export csv download statement">
              Export this month
            </Row>
            <Row icon={ServerCog} onSelect={() => run(toggleEnv)} keywords="testnet mainnet environment switch">
              Toggle Testnet / Mainnet
            </Row>
            <Row icon={Rows3} onSelect={() => run(toggleDensity)} keywords="density compact comfortable">
              Toggle density
            </Row>
            <Row icon={IndianRupee} onSelect={() => run(toggleFormat)} keywords="rupee format compact full lakh crore">
              Toggle ₹ format
            </Row>
            <Row icon={Play} onSelect={() => run(() => scenario.play())} keywords="demo scenario play run tour">
              Run demo
            </Row>
          </Group>

          <Group heading="Pages">
            {ALL_NAV.map((item) => (
              <Row key={item.href} icon={item.icon} onSelect={() => go(item.href)} keywords={item.label + " " + item.desc}>
                {item.label}
                <Hint>{item.desc}</Hint>
              </Row>
            ))}
          </Group>

          <Group heading="Users">
            {topUsers.map((u) => (
              <Row key={u.id} onSelect={() => go("/users")} keywords={`${u.name} ${u.city} ${u.tier}`}
                left={<Avatar name={u.name} initials={u.initials} size={22} />}>
                {u.name}
                <Hint>{u.city} · {u.tier}</Hint>
              </Row>
            ))}
          </Group>

          <Group heading="Transactions">
            {recentTx.map((t) => (
              <Row key={t.id} icon={t.dir === "in" ? ArrowUpRight : ArrowUpRight} onSelect={() => go("/transactions")} keywords={`${t.hash} ${t.userName} ${t.type}`}>
                <span className="font-mono">{truncHash(t.hash)}</span>
                <Hint>
                  <span className={t.dir === "in" ? "text-pos" : "text-neg"}>
                    {t.dir === "in" ? "+" : "−"}{inr(t.amount)}
                  </span>{" "}
                  · {t.userName}
                </Hint>
              </Row>
            ))}
          </Group>
        </Command.List>
        <div className="flex items-center gap-3 border-t border-border-subtle px-3 py-2 text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1"><CornerDownLeft className="size-3" /> to select</span>
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> to navigate</span>
        </div>
      </Command>
    </Modal>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:eyebrow"
    >
      {children}
    </Command.Group>
  );
}

function Row({
  icon: Icon,
  left,
  children,
  onSelect,
  keywords,
}: {
  icon?: typeof Banknote;
  left?: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
  keywords?: string;
}) {
  return (
    <Command.Item
      value={keywords}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] text-text-secondary outline-none data-[selected=true]:bg-surface-2 data-[selected=true]:text-text-primary"
    >
      {left ?? (Icon && <Icon className="size-4 shrink-0 text-text-tertiary" />)}
      <span className="flex flex-1 items-center gap-2 truncate">{children}</span>
    </Command.Item>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto truncate font-mono text-[11px] text-text-tertiary">{children}</span>;
}
