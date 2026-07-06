"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ScanSearch, ListChecks, Boxes, Check, ShieldAlert, FileText } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { CaseDrawer } from "@/components/compliance/case-drawer";
import { clockIST, truncHash } from "@/lib/format";
import { sanctions as seedSanctions, monitoringRules as seedRules, type ComplianceCase, type CaseStatus, type SanctionMatch, type MonitoringRule, type AuditEntry } from "@/lib/data/compliance";
import { cn } from "@/lib/cn";

const sevTone = { low: "cool", med: "warn", high: "crit" } as const;
const statusTone: Record<CaseStatus, "warn" | "cool" | "pos" | "brand"> = { open: "warn", in_review: "cool", cleared: "pos", reported: "brand" };
const statusLabel: Record<CaseStatus, string> = { open: "Open", in_review: "In review", cleared: "Cleared", reported: "Reported" };

export default function CompliancePage() {
  const [tab, setTab] = useState("cases");
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);

  const fetchData = async () => {
    try {
      const resCases = await fetch('/biz/admin/compliance/cases');
      const dataCases = await resCases.json();
      setCases(dataCases.cases || []);

      const resAudit = await fetch('/biz/admin/compliance/audit');
      const dataAudit = await resAudit.json();
      setAudit(dataAudit.audit || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Demo cue: jump to the audit log and verify integrity.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "verify") return;
    window.history.replaceState(null, "", window.location.pathname);
    setTab("audit");
    setAutoVerify(true);
  }, []);

  if (loading)
    return (
      <PageContainer>
        <Skeleton className="mb-5 h-7 w-52" />
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[14px]" />)}
        </div>
        <Skeleton className="h-96 rounded-[14px]" />
      </PageContainer>
    );

  const openCasesCount = cases.filter((c) => c.status === "open" || c.status === "in_review").length;

  return (
    <PageContainer>
      <PageHeader title="Compliance Center" subtitle="AML, sanctions screening and reporting — every payout governed and provably logged." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open cases" value={String(openCasesCount)} tone="text-warn" />
        <Kpi label="Sanctions hits · 24h" value="2" tone="text-crit" />
        <Kpi label="STRs filed · MTD" value={String(cases.filter(c => c.status === 'reported').length)} />
        <Kpi label="Travel-Rule coverage" value="96.4%" tone="text-pos" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabTrigger value="cases"><ShieldAlert className="size-4" /> Cases</TabTrigger>
          <TabTrigger value="screening"><ScanSearch className="size-4" /> Screening</TabTrigger>
          <TabTrigger value="rules"><ListChecks className="size-4" /> Monitoring</TabTrigger>
          <TabTrigger value="audit"><Boxes className="size-4" /> Audit log</TabTrigger>
        </TabsList>
        <TabContent value="cases"><CasesTab cases={cases} onRefresh={fetchData} /></TabContent>
        <TabContent value="screening"><ScreeningTab /></TabContent>
        <TabContent value="rules"><RulesTab /></TabContent>
        <TabContent value="audit"><AuditTab auditLog={audit} autoVerify={autoVerify} /></TabContent>
      </Tabs>
    </PageContainer>
  );
}

function CasesTab({ cases, onRefresh }: { cases: ComplianceCase[]; onRefresh: () => void }) {
  const [sel, setSel] = useState<ComplianceCase | null>(null);
  const [open, setOpen] = useState(false);

  const resolve = async (id: string, status: CaseStatus) => {
    try {
      const res = await fetch(`/biz/admin/compliance/cases/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: `Status updated to ${status} via dashboard`, actor: "Ananya Rao" })
      });
      if (res.ok) {
        onRefresh();
        // Update local selected state if drawer remains open
        if (sel && sel.id === id) {
          setSel(prev => prev ? { ...prev, status } : null);
        }
      } else {
        toast.error("Failed to update case");
      }
    } catch (err) {
      toast.error("Network error updating case");
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[110px_minmax(140px,1fr)_minmax(180px,1.4fr)_90px_120px_110px] items-center gap-2 border-b border-border-subtle bg-sunken/70 px-5 py-2.5">
            {["Case", "Subject", "Reason", "Severity", "Assignee", "Status"].map((h) => <span key={h} className="font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">{h}</span>)}
          </div>
          {cases.map((c) => (
            <button key={c.id} onClick={() => { setSel(c); setOpen(true); }} className="grid w-full grid-cols-[110px_minmax(140px,1fr)_minmax(180px,1.4fr)_90px_120px_110px] items-center gap-2 border-b border-border-subtle px-5 py-3 text-left transition-colors hover:bg-surface-2/50 cursor-pointer">
              <span className="font-mono text-[12px] text-text-secondary">{c.id}</span>
              <span className="flex min-w-0 items-center gap-2"><Avatar name={c.user.name} initials={c.user.initials} size={24} /><span className="truncate text-[13px] text-text-primary">{c.user.name}</span></span>
              <span className="truncate text-[12.5px] text-text-secondary">{c.reason}</span>
              <span><Pill tone={sevTone[c.severity]}>{c.severity[0].toUpperCase() + c.severity.slice(1)}</Pill></span>
              <span className="truncate text-[12px] text-text-tertiary">{c.assignee}</span>
              <span><Pill tone={statusTone[c.status]}>{statusLabel[c.status]}</Pill></span>
            </button>
          ))}
        </div>
      </div>
      <CaseDrawer c={sel} open={open} onOpenChange={setOpen} onResolve={resolve} />
    </Card>
  );
}

function ScreeningTab() {
  const [list, setList] = useState<SanctionMatch[]>(seedSanctions);
  return (
    <div className="grid gap-4">
      <Card>
        <CardBody>
          <CardHead label="Sanctions & watchlist screening" info="Matches against OFAC, UN and EU lists with confidence." />
          <div className="mt-3 space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-border-subtle bg-surface-2/40 px-4 py-3">
                <ScanSearch className="size-4 text-text-tertiary" />
                <div className="min-w-[140px] flex-1">
                  <div className="text-[13px] font-medium text-text-primary">{s.name}</div>
                  <div className="font-mono text-[11px] text-text-tertiary">{s.list}</div>
                </div>
                <div className="w-28">
                  <div className="mb-1 flex justify-between font-mono text-[10.5px] text-text-tertiary"><span>match</span><span style={{ color: s.confidence > 65 ? "var(--color-crit)" : "var(--color-warn)" }}>{s.confidence}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${s.confidence}%`, background: s.confidence > 65 ? "var(--color-crit)" : "var(--color-warn)" }} /></div>
                </div>
                {s.status === "pending" ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => { setList((l) => l.map((x) => x.id === s.id ? { ...x, status: "cleared" } : x)); toast("Match cleared", { description: s.name }); }}>Clear</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setList((l) => l.map((x) => x.id === s.id ? { ...x, status: "confirmed" } : x)); toast("Match confirmed — account frozen", { description: s.name }); }}>Confirm</Button>
                  </div>
                ) : (
                  <Pill tone={s.status === "cleared" ? "pos" : "crit"}>{s.status === "cleared" ? "Cleared" : "Confirmed"}</Pill>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<MonitoringRule[]>(seedRules);
  return (
    <Card className="overflow-hidden">
      <CardBody><CardHead label="Transaction monitoring rules" info="Active rules and their recent hit counts." /></CardBody>
      <div className="divide-y divide-border-subtle border-t border-border-subtle">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex-1">
              <div className="text-[13.5px] font-medium text-text-primary">{r.name}</div>
              <div className="font-mono text-[11.5px] text-text-tertiary">{r.definition}</div>
            </div>
            <div className="text-right"><div className="font-mono text-[14px] font-semibold tabular-nums text-text-primary">{r.hits}</div><div className="text-[10.5px] text-text-tertiary">hits · 30d</div></div>
            <Switch checked={r.enabled} onCheckedChange={(v) => { setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, enabled: v } : x)); toast(v ? "Rule enabled" : "Rule paused", { description: r.name }); }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditTab({ auditLog, autoVerify = false }: { auditLog: AuditEntry[]; autoVerify?: boolean }) {
  const [verified, setVerified] = useState(false);
  const verify = () => {
    setVerified(true);
    setTimeout(() => toast("Integrity verified", { description: `${auditLog.length} entries · chain intact` }), auditLog.length * 14 + 300);
  };

  useEffect(() => {
    if (!autoVerify) return;
    const t = setTimeout(verify, 1200);
    return () => clearTimeout(t);
  }, [autoVerify]);

  return (
    <Card className="overflow-hidden">
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <CardHead label="Blackbox · tamper-evident audit log" info="Every fiat/crypto and operator action, hash-chained prev → hash." />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={verify}>Verify integrity</Button>
          <Button size="sm" variant="primary" onClick={() => toast("Compliance report generated", { description: "Period · policy checks passed · ratios · case outcomes" })}>Generate report</Button>
        </div>
      </CardBody>
      <div className="max-h-[560px] overflow-y-auto border-t border-border-subtle">
        {auditLog.map((e, i) => (
          <div key={e.seq} className="flex gap-3 px-5 py-2.5">
            <div className="flex flex-col items-center pt-1">
              <span className={cn("grid size-4 place-items-center rounded-full transition-colors duration-300", verified ? "bg-pos-fill" : "bg-surface-3")} style={{ transitionDelay: `${(auditLog.length - i) * 12}ms` }}>
                {verified && <Check className="size-2.5 text-pos" style={{ transitionDelay: `${(auditLog.length - i) * 12}ms` }} />}
              </span>
              {i < auditLog.length - 1 && <span className={cn("w-px flex-1", verified ? "bg-pos/40" : "bg-border-subtle")} style={{ minHeight: 18 }} />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-brand">{e.action}</span>
                <span className="text-[12.5px] text-text-secondary">{e.detail}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-text-tertiary">
                <span>{e.actor}</span>
                <span>{clockIST(e.at)} IST</span>
                <span title={`prev: ${e.prevHash}`} className="text-text-tertiary/80">#{truncHash(e.hash, 6, 4)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Kpi({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (
    <Card><CardBody><div className="eyebrow mb-2">{label}</div><div className={cn("font-mono text-[26px] font-semibold tabular-nums", tone)}>{value}</div></CardBody></Card>
  );
}
