"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, FileCode2, Webhook, Activity, ScrollText, Plus, RotateCw, Trash2, RefreshCw, TriangleAlert, Check, Copy } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBlock } from "@/components/ui/code-block";
import { Modal, DialogClose } from "@/components/ui/dialog";
import { Copyable } from "@/components/ui/copyable";
import { useNow, useCopy } from "@/lib/hooks";
import { relTime, clockIST } from "@/lib/format";
import { sepEndpoints, infra, requestLogs, usage, usageSeries, STELLAR_TOML, WEBHOOK_EVENTS, samplePayload, type ApiKey, type Delivery } from "@/lib/data/dev";
import { ORG } from "@/lib/data/store";
import { Sparkline } from "@/components/viz/sparkline";
import { cn } from "@/lib/cn";

export default function DeveloperPage() {
  const ready = useNow(30_000);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/biz/admin/developer/keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await fetch("/biz/admin/developer/webhooks/deliveries");
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchKeys(), fetchDeliveries()]).finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <PageContainer>
        <Skeleton className="mb-5 h-7 w-48" />
        <Skeleton className="mb-4 h-9 w-96" />
        <Skeleton className="h-96 rounded-[14px]" />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader title="Developer Console" subtitle="Keys, configuration, webhooks and endpoint health — anchors are developers too." />
      <Tabs defaultValue="keys">
        <TabsList className="mb-4">
          <TabTrigger value="keys"><KeyRound className="size-4" /> API Keys</TabTrigger>
          <TabTrigger value="config"><FileCode2 className="size-4" /> Configuration</TabTrigger>
          <TabTrigger value="webhooks"><Webhook className="size-4" /> Webhooks</TabTrigger>
          <TabTrigger value="sep"><Activity className="size-4" /> SEP Health</TabTrigger>
          <TabTrigger value="logs"><ScrollText className="size-4" /> Logs</TabTrigger>
        </TabsList>
        <TabContent value="keys"><ApiKeysTab keys={keys} onRefresh={fetchKeys} createOpen={createOpen} setCreateOpen={setCreateOpen} /></TabContent>
        <TabContent value="config"><ConfigTab /></TabContent>
        <TabContent value="webhooks"><WebhooksTab deliveries={deliveries} setDeliveries={setDeliveries} /></TabContent>
        <TabContent value="sep"><SepTab /></TabContent>
        <TabContent value="logs"><LogsTab /></TabContent>
      </Tabs>
    </PageContainer>
  );
}

/* ---------------- API Keys ---------------- */
function ApiKeysTab({ keys, onRefresh, createOpen, setCreateOpen }: { keys: ApiKey[]; onRefresh: () => void; createOpen: boolean; setCreateOpen: (v: boolean) => void }) {
  const now = useNow(30_000);
  const [rolledSecret, setRolledSecret] = useState<string | null>(null);
  const [rolledKeyName, setRolledKeyName] = useState<string>("");
  const { copied, copy } = useCopy();

  const handleRoll = async (id: string, name: string) => {
    try {
      const res = await fetch(`/biz/admin/developer/keys/${id}/roll`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRolledSecret(data.secret);
        setRolledKeyName(name);
        toast.success("Key rolled", { description: `${name} secret updated` });
        onRefresh();
      } else {
        toast.error("Failed to roll key");
      }
    } catch (err) {
      toast.error("Error rolling key");
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    try {
      const res = await fetch(`/biz/admin/developer/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Key revoked", { description: name });
        onRefresh();
      } else {
        toast.error("Failed to revoke key");
      }
    } catch (err) {
      toast.error("Error revoking key");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardBody className="flex items-center justify-between">
        <CardHead label="API keys" info="Test vs Live keys are gated by the environment switcher." />
        <Button size="sm" variant="primary" leadingIcon={<Plus className="size-3.5" />} onClick={() => setCreateOpen(true)}>Create key</Button>
      </CardBody>
      <div className="divide-y divide-border-subtle border-t border-border-subtle">
        {keys.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <div className="min-w-[150px] flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">
                {k.name}
                <Pill tone={k.live ? "pos" : "cool"} dot={false}>{k.live ? "Live" : "Test"}</Pill>
              </div>
              <Copyable value={k.secret} display={k.masked} className="mt-0.5 text-[12px]" />
            </div>
            <div className="flex gap-1">{k.scopes.map((s) => <span key={s} className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">{s}</span>)}</div>
            <div className="w-28 font-mono text-[11px] text-text-tertiary">used {relTime(k.lastUsed, now)}</div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" leadingIcon={<RotateCw className="size-3.5" />} onClick={() => handleRoll(k.id, k.name)}>Roll</Button>
              <Button size="sm" variant="ghost" className="text-crit hover:bg-crit-fill" leadingIcon={<Trash2 className="size-3.5" />} onClick={() => handleRevoke(k.id, k.name)}>Revoke</Button>
            </div>
          </div>
        ))}
      </div>
      <CreateKeyModal open={createOpen} onOpenChange={setCreateOpen} onRefresh={onRefresh} />

      {/* Rolled Key Display Modal */}
      <Modal open={!!rolledSecret} onOpenChange={(v) => !v && setRolledSecret(null)} size="md" title="Key rolled successfully">
        <div className="border-b border-border-subtle px-5 py-4"><h2 className="font-display text-[16px] font-semibold text-text-primary">Key rolled successfully · {rolledKeyName}</h2></div>
        <div className="px-5 py-5 space-y-3">
          <div className="flex items-start gap-2.5 rounded-[10px] border border-warn/25 bg-warn-fill px-3 py-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
            <p className="text-[12.5px] text-text-primary">Copy this secret now — you won&apos;t be able to see it again.</p>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] border border-border-default bg-sunken px-3 py-2.5">
            <code className="flex-1 truncate font-mono text-[12.5px] text-text-primary">{rolledSecret}</code>
            <button onClick={() => { if(rolledSecret) copy(rolledSecret); }} className="grid size-7 place-items-center rounded-[7px] text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
              {copied ? <Check className="size-4 text-pos" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-4">
          <DialogClose asChild><Button variant="primary">Done</Button></DialogClose>
        </div>
      </Modal>
    </Card>
  );
}

function CreateKeyModal({ open, onOpenChange, onRefresh }: { open: boolean; onOpenChange: (v: boolean) => void; onRefresh: () => void }) {
  const [name, setName] = useState("");
  const [live, setLive] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const create = async () => {
    try {
      const res = await fetch("/biz/admin/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "New key", live })
      });
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret);
        onRefresh();
      } else {
        toast.error("Failed to create key");
      }
    } catch (e) {
      toast.error("Error creating key");
    }
  };

  return (
    <Modal open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setName(""); setSecret(null); setLive(false); } }} size="md" title="Create API key">
      <div className="border-b border-border-subtle px-5 py-4"><h2 className="font-display text-[16px] font-semibold text-text-primary">Create API key</h2></div>
      <div className="px-5 py-5">
        {!secret ? (
          <div className="space-y-4">
            <div>
              <label className="eyebrow">Key name</label>
              <Input className="mt-2" autoFocus placeholder="e.g. Production server" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-[10px] border border-border-subtle bg-surface-2/40 px-3 py-2">
              <div>
                <div className="text-[13px] font-medium text-text-primary">Live mode</div>
                <div className="text-[11px] text-text-tertiary">Produce real production-scoped logs</div>
              </div>
              <button 
                type="button" 
                onClick={() => setLive(prev => !prev)}
                className={cn("w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5", live ? "bg-pos" : "bg-surface-3")}
              >
                <div className={cn("size-4 rounded-full bg-white transition-transform", live ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-warn/25 bg-warn-fill px-3 py-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
              <p className="text-[12.5px] text-text-primary">Copy this secret now — you won&apos;t be able to see it again.</p>
            </div>
            <div className="flex items-center gap-2 rounded-[10px] border border-border-default bg-sunken px-3 py-2.5">
              <code className="flex-1 truncate font-mono text-[12.5px] text-text-primary">{secret}</code>
              <button onClick={() => copy(secret)} className="grid size-7 place-items-center rounded-[7px] text-text-tertiary hover:bg-surface-2 hover:text-text-primary">{copied ? <Check className="size-4 text-pos" /> : <Copy className="size-4" />}</button>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-4">
        {!secret ? (
          <><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button variant="primary" onClick={create}>Create key</Button></>
        ) : (
          <DialogClose asChild><Button variant="primary">Done</Button></DialogClose>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- Configuration ---------------- */
function ConfigTab() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <CardHead label="stellar.toml · SEP-1" info="Served at /.well-known/stellar.toml" />
            <Pill tone="pos" icon={<Check className="size-3" />}>Valid</Pill>
          </div>
          <CodeBlock code={STELLAR_TOML} lang="toml" filename={`${ORG.homeDomain}/.well-known/stellar.toml`} downloadName="stellar.toml" maxHeight={520} />
        </CardBody>
      </Card>
    </div>
  );
}

/* ---------------- Webhooks ---------------- */
function WebhooksTab({ deliveries, setDeliveries }: { deliveries: Delivery[]; setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>> }) {
  const now = useNow(20_000);
  const [payload, setPayload] = useState<Delivery | null>(null);

  const replay = (d: Delivery) => {
    const nd: Delivery = { ...d, id: 'wh_' + Math.floor(Math.random()*1000), status: 200, at: Date.now(), attempts: 1, ms: Math.floor(Math.random()*80 + 50) };
    setDeliveries((ds) => [nd, ...ds]);
    toast("Webhook replayed", { description: `${d.event} → 200 OK` });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardBody>
          <CardHead label="Endpoint" />
          <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-border-default bg-surface-2/40 px-3 py-2.5">
            <span className="font-mono text-[10px] text-pos">POST</span>
            <code className="flex-1 truncate font-mono text-[12.5px] text-text-primary">https://{ORG.homeDomain}/webhooks/nordstern</code>
            <Pill tone="pos">Active</Pill>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{WEBHOOK_EVENTS.map((e) => <span key={e} className="rounded-[6px] bg-surface-2 px-2 py-1 font-mono text-[11px] text-text-secondary">{e}</span>)}</div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3"><CardHead label="Delivery log" /></div>
        <div className="overflow-x-auto border-t border-border-subtle">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1fr_80px_120px_70px_70px_90px] items-center gap-2 border-b border-border-subtle bg-sunken/70 px-5 py-2.5">
              {["Event", "Status", "Time", "Tries", "ms", ""].map((h) => <span key={h} className="font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">{h}</span>)}
            </div>
            {deliveries.map((d) => (
              <button key={d.id} onClick={() => setPayload(d)} className="grid w-full grid-cols-[1fr_80px_120px_70px_70px_90px] items-center gap-2 border-b border-border-subtle px-5 py-2.5 text-left transition-colors hover:bg-surface-2/50 cursor-pointer">
                <span className="font-mono text-[12.5px] text-text-primary">{d.event}</span>
                <span><Pill tone={d.status < 300 ? "pos" : d.status < 500 ? "warn" : "crit"} dot={false}>{d.status}</Pill></span>
                <span className="font-mono text-[11.5px] text-text-tertiary">{relTime(d.at, now)}</span>
                <span className="font-mono text-[12px] tabular-nums text-text-secondary">{d.attempts}</span>
                <span className="font-mono text-[12px] tabular-nums text-text-tertiary">{d.ms}</span>
                <span onClick={(e) => { e.stopPropagation(); replay(d); }} className="flex items-center gap-1 justify-self-end text-[11.5px] font-medium text-brand hover:text-brand-300 cursor-pointer"><RefreshCw className="size-3" /> Replay</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Modal open={!!payload} onOpenChange={(v) => !v && setPayload(null)} size="lg" title="Webhook payload" className="p-0 overflow-hidden">
        <div className="border-b border-border-subtle px-5 py-4"><h2 className="font-display text-[15px] font-semibold text-text-primary">{payload?.event}</h2></div>
        <div className="p-4">{payload && <CodeBlock code={samplePayload(payload.event)} lang="json" filename="payload.json" />}</div>
      </Modal>
    </div>
  );
}

/* ---------------- SEP Health ---------------- */
function SepTab() {
  const dot = (s: string) => (s === "up" ? "bg-pos" : s === "degraded" ? "bg-warn" : "bg-crit");
  const txt = (s: string) => (s === "up" ? "text-pos" : s === "degraded" ? "text-warn" : "text-crit");
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...sepEndpoints, ...infra.map((i) => ({ name: i.name, desc: "Network", status: i.status, ms: i.ms }))].map((e) => (
          <Card key={e.name}>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2"><span className={cn("absolute inline-flex size-full animate-[dot-pulse_1.8s_ease-in-out_infinite] rounded-full", dot(e.status))} /><span className={cn("relative inline-flex size-2 rounded-full", dot(e.status))} /></span>
                  <span className="font-mono text-[13px] font-semibold text-text-primary">{e.name}</span>
                </div>
                <div className="mt-1 text-[12px] text-text-tertiary">{e.desc}</div>
              </div>
              <div className="text-right">
                <div className={cn("text-[12px] font-medium capitalize", txt(e.status))}>{e.status}</div>
                <div className="font-mono text-[12px] tabular-nums text-text-secondary">{e.ms}ms</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardBody>
          <CardHead label="API usage · requests/min" />
          <div className="mt-3"><Sparkline data={usageSeries.map((u) => u.rpm)} height={70} tone="brand" /></div>
          <div className="mt-3 grid grid-cols-3 gap-4 border-t border-border-subtle pt-3">
            <Mini label="Error rate" value={`${usage.errorRate}%`} tone="text-pos" />
            <Mini label="P95 latency" value={`${usage.p95}ms`} />
            <Mini label="Rate-limit headroom" value={`${usage.rateLimitHeadroom}%`} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ---------------- Logs ---------------- */
function LogsTab() {
  const [q, setQ] = useState("");
  const logs = requestLogs.filter((l) => !q || `${l.method} ${l.path} ${l.status}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <CardHead label="Request log" />
        <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-48" />
      </div>
      <div className="overflow-x-auto border-t border-border-subtle">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[70px_1fr_70px_80px_140px_110px] items-center gap-2 border-b border-border-subtle bg-sunken/70 px-5 py-2.5">
            {["Method", "Path", "Status", "ms", "Key", "Time"].map((h) => <span key={h} className="font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">{h}</span>)}
          </div>
          {logs.slice(0, 40).map((l) => (
            <div key={l.id} className="grid grid-cols-[70px_1fr_70px_80px_140px_110px] items-center gap-2 border-b border-border-subtle px-5 py-2 text-left">
              <span className={cn("font-mono text-[11px] font-medium", l.method === "GET" ? "text-cool" : "text-brand")}>{l.method}</span>
              <span className="truncate font-mono text-[12.5px] text-text-primary">{l.path}</span>
              <span className={cn("font-mono text-[12px] tabular-nums", l.status < 300 ? "text-pos" : l.status < 500 ? "text-warn" : "text-crit")}>{l.status}</span>
              <span className="font-mono text-[12px] tabular-nums text-text-tertiary">{l.ms}</span>
              <span className="truncate font-mono text-[11px] text-text-tertiary">{l.key}</span>
              <span className="font-mono text-[11px] text-text-tertiary">{clockIST(l.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (<div><div className="eyebrow mb-1">{label}</div><div className={cn("font-mono text-[16px] font-semibold tabular-nums", tone)}>{value}</div></div>);
}
