"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Braces,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  KeyRound,
  Layers3,
  Play,
  Radio,
  TerminalSquare,
  Webhook,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

type Language = "TypeScript" | "Node" | "cURL";
type RequestState = "ready" | "sending" | "complete";

const tabs: Language[] = ["TypeScript", "Node", "cURL"];

const code: Record<Language, ReactNode> = {
  TypeScript: (
    <>
      <CodeLine number={1}><Syntax color="violet">import</Syntax> {"{ NordStern }"} <Syntax color="violet">from</Syntax> <Syntax color="green">&quot;@nordstern/sdk&quot;</Syntax>;</CodeLine>
      <CodeLine number={2} />
      <CodeLine number={3}><Syntax color="violet">const</Syntax> client = <Syntax color="violet">new</Syntax> <Syntax color="yellow">NordStern</Syntax>({"{"}</CodeLine>
      <CodeLine number={4} active indent>apiKey: process.env.<Syntax color="blue">NORDSTERN_KEY</Syntax>,<Cursor /></CodeLine>
      <CodeLine number={5}>{"});"}</CodeLine>
      <CodeLine number={6} />
      <CodeLine number={7}><Syntax color="violet">const</Syntax> deposit = <Syntax color="violet">await</Syntax> client.deposits.<Syntax color="blue">create</Syntax>({"{"}</CodeLine>
      <CodeLine number={8} indent>asset: <Syntax color="green">&quot;ANCH&quot;</Syntax>,</CodeLine>
      <CodeLine number={9} indent>amount: <Syntax color="green">&quot;25000.00&quot;</Syntax>,</CodeLine>
      <CodeLine number={10} indent>rail: <Syntax color="green">&quot;upi&quot;</Syntax>,</CodeLine>
      <CodeLine number={11} indent>destination: wallet.publicKey,</CodeLine>
      <CodeLine number={12}>{"});"}</CodeLine>
    </>
  ),
  Node: (
    <>
      <CodeLine number={1}><Syntax color="violet">const</Syntax> {"{ NordStern }"} = <Syntax color="blue">require</Syntax>(<Syntax color="green">&quot;@nordstern/sdk&quot;</Syntax>);</CodeLine>
      <CodeLine number={2} />
      <CodeLine number={3}><Syntax color="violet">const</Syntax> client = <Syntax color="violet">new</Syntax> <Syntax color="yellow">NordStern</Syntax>({"{"}</CodeLine>
      <CodeLine number={4} active indent>apiKey: process.env.<Syntax color="blue">NORDSTERN_KEY</Syntax>,<Cursor /></CodeLine>
      <CodeLine number={5}>{"});"}</CodeLine>
      <CodeLine number={6} />
      <CodeLine number={7}><Syntax color="violet">const</Syntax> deposit = <Syntax color="violet">await</Syntax> client.deposits.<Syntax color="blue">create</Syntax>({"{"}</CodeLine>
      <CodeLine number={8} indent>asset: <Syntax color="green">&quot;ANCH&quot;</Syntax>, amount: <Syntax color="green">&quot;25000.00&quot;</Syntax>,</CodeLine>
      <CodeLine number={9} indent>rail: <Syntax color="green">&quot;upi&quot;</Syntax>,</CodeLine>
      <CodeLine number={10} indent>destination: wallet.publicKey,</CodeLine>
      <CodeLine number={11}>{"});"}</CodeLine>
    </>
  ),
  cURL: (
    <>
      <CodeLine number={1}>curl <Syntax color="yellow">POST</Syntax> \</CodeLine>
      <CodeLine number={2} active indent><Syntax color="green">https://api.nordstern.dev/v1/deposits</Syntax> \<Cursor /></CodeLine>
      <CodeLine number={3} indent>-H <Syntax color="green">&quot;Authorization: Bearer $TOKEN&quot;</Syntax> \</CodeLine>
      <CodeLine number={4} indent>-H <Syntax color="green">&quot;Content-Type: application/json&quot;</Syntax> \</CodeLine>
      <CodeLine number={5} indent>-d <Syntax color="green">&apos;{"{"}</Syntax></CodeLine>
      <CodeLine number={6} indent><Syntax color="green">&apos;  &quot;asset&quot;: &quot;ANCH&quot;,&apos;</Syntax></CodeLine>
      <CodeLine number={7} indent><Syntax color="green">&apos;  &quot;amount&quot;: &quot;25000.00&quot;,&apos;</Syntax></CodeLine>
      <CodeLine number={8} indent><Syntax color="green">&apos;  &quot;rail&quot;: &quot;upi&quot;&apos;</Syntax></CodeLine>
      <CodeLine number={9} indent><Syntax color="green">&apos;{"}"}&apos;</Syntax></CodeLine>
    </>
  ),
};

export function BuildPaths() {
  const [language, setLanguage] = useState<Language>("TypeScript");
  const [request, setRequest] = useState<RequestState>("complete");

  useEffect(() => {
    if (request !== "sending") return;
    const timer = window.setTimeout(() => setRequest("complete"), 1050);
    return () => window.clearTimeout(timer);
  }, [request]);

  function runRequest() {
    setRequest("sending");
  }

  return (
    <Section id="build" tone="surface" className="overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -left-40 top-52 size-[34rem] rounded-full bg-brand-100/60 blur-3xl" />

        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_0.58fr]">
          <div>
            <h2 className="max-w-3xl text-[clamp(2.15rem,4.4vw,4rem)] font-normal leading-[1.02] tracking-[-0.035em] text-ink">
              Your Anchor, down to <span className="text-muted">the last detail.</span>
            </h2>
          </div>
          <div className="lg:pb-1">
            <p className="max-w-xl text-[17px] leading-relaxed text-muted">
              NordStern handles Stellar protocols, financial rails, and settlement infrastructure. When you need deeper control, our SDK gives your team an additional way to build a fully custom experience on top.
            </p>
            <a href="/docs" className="group mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-noir-soft hover:shadow-md">
              Explore the SDK
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        <Stagger className="relative mt-14">
          <StaggerItem>
            <div className="relative min-h-[780px] rounded-[32px] border border-black/[0.06] bg-[linear-gradient(145deg,#ebe8fb_0%,#f8f8fa_42%,#e8eceb_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] sm:min-h-[710px] sm:p-6 lg:min-h-[650px] lg:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(#9d94c9_0.7px,transparent_0.7px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/80 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-medium text-ink">All systems operational</span>
                  <span className="text-subtle">· Testnet</span>
                </div>
                <div className="hidden items-center gap-5 font-mono text-[10px] text-muted sm:flex">
                  <span>99.99% uptime</span><span>v1.8.2</span><span className="text-emerald-700">184ms p95</span>
                </div>
              </div>

              <div className="relative z-10 mt-5 grid overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0c10] shadow-[0_28px_70px_-24px_rgba(15,12,35,.65)] lg:absolute lg:bottom-9 lg:left-8 lg:right-[24%] lg:top-20 lg:mt-0 lg:grid-cols-[168px_1fr]">
                <aside className="hidden border-r border-white/[0.07] bg-white/[0.018] p-3 lg:block">
                  <div className="mb-4 flex items-center gap-2 px-2 py-1 font-mono text-[10px] text-white/35"><Layers3 className="size-3.5" /> EXPLORER</div>
                  <ExplorerGroup label="Deposits" active />
                  <ExplorerGroup label="Withdrawals" />
                  <ExplorerGroup label="Customers" />
                  <ExplorerGroup label="Webhooks" />
                  <div className="mt-5 border-t border-white/[0.07] pt-4">
                    <p className="px-2 font-mono text-[9px] uppercase tracking-wider text-white/25">Environment</p>
                    <div className="mt-2 flex items-center justify-between rounded-md bg-white/[0.04] px-2 py-2 font-mono text-[10px] text-white/60"><span>Sandbox</span><ChevronDown className="size-3" /></div>
                  </div>
                </aside>

                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-3 sm:px-4">
                    <div className="flex min-w-0 overflow-x-auto">
                      {tabs.map((tab) => (
                        <button key={tab} type="button" onClick={() => setLanguage(tab)} className={`relative shrink-0 px-3 py-3.5 font-mono text-[10px] transition sm:px-4 sm:text-[11px] ${language === tab ? "bg-white/[0.035] text-white" : "text-white/30 hover:text-white/60"}`}>
                          {tab}{language === tab && <span className="absolute inset-x-0 bottom-0 h-px bg-brand-300 shadow-[0_0_9px_#bcb1f2]" />}
                        </button>
                      ))}
                    </div>
                    <div className="hidden items-center gap-2 font-mono text-[9px] text-white/25 sm:flex"><CircleDot className="size-3" /> anchor.ts</div>
                  </div>

                  <div className="min-h-[330px] overflow-x-auto py-5 font-mono text-[11px] leading-6 sm:py-6 sm:text-xs lg:min-h-0 lg:flex-1">
                    <div className="min-w-[590px]">{code[language]}</div>
                  </div>

                  <div className="border-t border-white/[0.07] bg-black/20">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
                      <div className="flex gap-4 font-mono text-[9px] uppercase tracking-wider"><span className="text-white/60">Terminal</span><span className="text-white/20">Output</span><span className="text-white/20">Problems</span></div>
                      <TerminalSquare className="size-3.5 text-white/25" />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 truncate font-mono text-[10px] text-white/45"><span className="text-emerald-300">→</span> Ready to create deposit on <span className="text-brand-200">testnet</span></div>
                      <button type="button" onClick={runRequest} disabled={request === "sending"} className="flex shrink-0 items-center gap-2 rounded-md bg-brand px-3 py-2 font-mono text-[10px] font-semibold text-noir shadow-[0_0_18px_rgba(171,159,242,.18)] transition hover:bg-brand-300 disabled:cursor-wait">
                        <Play className={`size-3 fill-current ${request === "sending" ? "animate-pulse" : ""}`} /> {request === "sending" ? "Sending" : "Run request"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <FloatingCard className="relative z-20 mt-3 sm:ml-auto sm:w-[56%] lg:absolute lg:right-6 lg:top-28 lg:mt-0 lg:w-[330px]" title="API response" icon={<Braces className="size-3.5" />} action={request === "sending" ? "PENDING" : "201 CREATED"} active={request !== "sending"}>
                <div className={`font-mono text-[10px] leading-5 transition-all duration-500 ${request === "sending" ? "translate-y-1 opacity-30 blur-[1px]" : "opacity-100"}`}>
                  <p className="text-white/25">{"{"}</p>
                  <JsonRow name="id" value="dep_8F2kq9" />
                  <JsonRow name="status" value="pending_user_transfer" />
                  <JsonRow name="rail" value="upi" last />
                  <p className="text-white/25">{"}"}</p>
                </div>
                <div className="mt-3 flex gap-2 border-t border-white/[0.07] pt-3 font-mono text-[9px] text-white/30"><span>POST</span><span className="text-white/60">/v1/deposits</span><span className="ml-auto text-emerald-300">184ms</span></div>
              </FloatingCard>

              <FloatingCard className="relative z-20 mt-3 sm:w-[62%] lg:absolute lg:bottom-7 lg:right-4 lg:mt-0 lg:w-[350px]" title="Live callbacks" icon={<Webhook className="size-3.5" />} action="LISTENING" active>
                <div className="space-y-1.5">
                  <WebhookEvent time="12:04:08" name="deposit.created" newest />
                  <WebhookEvent time="12:04:09" name="customer.accepted" />
                  <WebhookEvent time="12:04:11" name="payment.pending" />
                </div>
              </FloatingCard>

              <div className="relative z-20 mt-3 grid grid-cols-2 gap-3 sm:absolute sm:bottom-6 sm:left-6 sm:mt-0 sm:w-[310px] lg:bottom-auto lg:left-auto lg:right-5 lg:top-[330px] lg:w-[330px]">
                <MetricCard icon={<KeyRound className="size-3.5" />} label="Authentication" value="Token verified" good />
                <MetricCard icon={<Activity className="size-3.5" />} label="Rate limit" value="98.7k remaining" />
              </div>
            </div>
          </StaggerItem>
        </Stagger>

      </div>
    </Section>
  );
}

function Syntax({ children, color }: { children: ReactNode; color: "violet" | "green" | "blue" | "yellow" }) {
  const styles = { violet: "text-[#c4b5fd]", green: "text-[#86d9ba]", blue: "text-[#8ec5ff]", yellow: "text-[#f4cf87]" };
  return <span className={styles[color]}>{children}</span>;
}

function CodeLine({ number, active, indent, children }: { number: number; active?: boolean; indent?: boolean; children?: ReactNode }) {
  return <div className={`grid min-h-6 grid-cols-[36px_1fr] border-l-2 ${active ? "border-brand-300 bg-brand/[0.07]" : "border-transparent"}`}><span className="select-none pr-3 text-right text-white/18">{number}</span><span className={`whitespace-pre text-white/72 ${indent ? "pl-5" : ""}`}>{children}</span></div>;
}

function Cursor() {
  return <span className="ml-0.5 inline-block h-4 w-px translate-y-1 bg-brand-200 animate-pulse" aria-hidden="true" />;
}

function ExplorerGroup({ label, active }: { label: string; active?: boolean }) {
  return <div className={`mb-1 flex items-center gap-2 rounded-md px-2 py-2 font-mono text-[10px] ${active ? "bg-brand/10 text-brand-200" : "text-white/35"}`}><ChevronDown className={`size-3 ${active ? "" : "-rotate-90"}`} /><span>{label}</span>{active && <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] text-white/35">POST</span>}</div>;
}

function FloatingCard({ className, title, icon, action, active, children }: { className: string; title: string; icon: ReactNode; action: string; active?: boolean; children: ReactNode }) {
  return <div className={`${className} rounded-2xl border border-white/10 bg-[#111217]/95 p-4 text-white shadow-[0_22px_48px_-20px_rgba(20,17,45,.8)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_55px_-20px_rgba(20,17,45,.9)]`}><div className="mb-4 flex items-center gap-2 text-white/45">{icon}<span className="font-mono text-[9px] uppercase tracking-[0.14em]">{title}</span><span className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[8px] ${active ? "bg-emerald-400/10 text-emerald-300" : "bg-brand/10 text-brand-200"}`}><span className={`size-1.5 rounded-full ${active ? "bg-emerald-300" : "animate-pulse bg-brand-300"}`} />{action}</span></div>{children}</div>;
}

function JsonRow({ name, value, last }: { name: string; value: string; last?: boolean }) {
  return <p className="pl-4"><span className="text-[#8ec5ff]">&quot;{name}&quot;</span><span className="text-white/25">: </span><span className="text-[#86d9ba]">&quot;{value}&quot;</span>{last ? "" : <span className="text-white/25">,</span>}</p>;
}

function WebhookEvent({ time, name, newest }: { time: string; name: string; newest?: boolean }) {
  return <div className={`grid grid-cols-[52px_1fr_auto] items-center gap-2 rounded-lg px-2.5 py-2 font-mono text-[9px] transition ${newest ? "bg-brand/[0.08]" : "bg-white/[0.025]"}`}><span className="text-white/25">{time}</span><span className={newest ? "text-brand-200" : "text-white/55"}>{name}</span>{newest ? <Radio className="size-3 animate-pulse text-brand-300" /> : <CheckCircle2 className="size-3 text-emerald-300/60" />}</div>;
}

function MetricCard({ icon, label, value, good }: { icon: ReactNode; label: string; value: string; good?: boolean }) {
  return <div className="rounded-xl border border-black/[0.06] bg-white/90 p-3 shadow-lg backdrop-blur transition hover:-translate-y-0.5"><div className="flex items-center gap-1.5 text-subtle">{icon}<span className="font-mono text-[8px] uppercase tracking-wide">{label}</span></div><div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink">{good && <span className="size-1.5 rounded-full bg-emerald-500" />}{value}</div></div>;
}
