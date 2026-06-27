"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, UsersRound, Landmark, Palette, Bell, Check, Plus, Mail, MessageSquare, Monitor } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WebviewPreview } from "@/components/settings/webview-preview";
import { useSkeleton, useNow } from "@/lib/hooks";
import { relTime } from "@/lib/format";
import { team, ROLES, PERMISSIONS, bankAccounts, activityLog, NOTIFICATION_CHANNELS, type Role } from "@/lib/data/team";
import { cn } from "@/lib/cn";

const ACCENTS = ["#AB9FF2", "#2EC08B", "#7DB8F2", "#F2B84B", "#FF8C73"];
const roleTone: Record<Role, "brand" | "pos" | "warn" | "cool" | "neutral"> = { Admin: "brand", Finance: "pos", Compliance: "warn", Developer: "cool", Viewer: "neutral" };

export default function SettingsPage() {
  const ready = useSkeleton();
  if (!ready)
    return (
      <PageContainer>
        <Skeleton className="mb-5 h-7 w-44" />
        <Skeleton className="mb-4 h-9 w-[460px]" />
        <Skeleton className="h-96 rounded-[14px]" />
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader title="Settings & Team" subtitle="Organization, access control and white-label branding." />
      <Tabs defaultValue="org">
        <TabsList className="mb-4">
          <TabTrigger value="org"><Building2 className="size-4" /> Organization</TabTrigger>
          <TabTrigger value="team"><UsersRound className="size-4" /> Team & RBAC</TabTrigger>
          <TabTrigger value="bank"><Landmark className="size-4" /> Bank accounts</TabTrigger>
          <TabTrigger value="brand"><Palette className="size-4" /> Branding</TabTrigger>
          <TabTrigger value="notif"><Bell className="size-4" /> Notifications</TabTrigger>
        </TabsList>
        <TabContent value="org"><OrgTab /></TabContent>
        <TabContent value="team"><TeamTab /></TabContent>
        <TabContent value="bank"><BankTab /></TabContent>
        <TabContent value="brand"><BrandTab /></TabContent>
        <TabContent value="notif"><NotifTab /></TabContent>
      </Tabs>
    </PageContainer>
  );
}

function OrgTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardBody className="space-y-4">
          <CardHead label="Legal entity" />
          <Field label="Organization name" value="Acme Pay Technologies Pvt Ltd" />
          <Field label="Home domain" value="acmepay.in" mono />
          <Field label="FIU-IND registration" value="FIUIND-VA-0042817" mono />
          <Field label="Support contact" value="anchor@acmepay.in" mono />
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-4">
          <CardHead label="Asset" />
          <Field label="Token code" value="INRT" mono />
          <Field label="Issuer" value="GA3F…X9QZ" mono />
          <Field label="Backing" value="1:1 INR · regulated reserves" />
          <div className="flex items-center gap-2 pt-1"><Pill tone="pos" icon={<Check className="size-3" />}>Live on Testnet</Pill></div>
        </CardBody>
      </Card>
    </div>
  );
}

function TeamTab() {
  const now = useNow(30_000);
  return (
    <div className="grid gap-4">
      <Card className="overflow-hidden">
        <CardBody className="flex items-center justify-between">
          <CardHead label="Members" />
          <Button size="sm" variant="primary" leadingIcon={<Plus className="size-3.5" />} onClick={() => toast("Invite sent", { description: "They'll get an email to join Acme Pay." })}>Invite member</Button>
        </CardBody>
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {team.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={m.name} initials={m.initials} size={32} />
              <div className="min-w-[140px] flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">{m.name}{m.pending && <Pill tone="warn" dot={false}>Pending</Pill>}</div>
                <div className="font-mono text-[11px] text-text-tertiary">{m.email}</div>
              </div>
              <Pill tone={roleTone[m.role]}>{m.role}</Pill>
              <span className="w-24 text-right font-mono text-[11px] text-text-tertiary">{m.pending ? "invited" : relTime(m.lastActive, now)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardBody>
          <CardHead label="Permissions matrix" info="Who can do what, by role." />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="py-2 pr-3 text-left font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">Capability</th>
                  {ROLES.map((r) => <th key={r} className="px-2 py-2 text-center font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.label} className="border-b border-border-subtle last:border-0">
                    <td className="py-2.5 pr-3 text-text-secondary">{p.label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-2 py-2.5 text-center">
                        {p.grants[r] ? <Check className="mx-auto size-4 text-pos" /> : <span className="text-text-tertiary/40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardHead label="Activity log" info="Who did what." />
          <div className="mt-3 space-y-2.5">
            {activityLog.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar name={a.actor} initials={a.initials} size={24} />
                <span className="flex-1 text-[12.5px] text-text-secondary"><span className="font-medium text-text-primary">{a.actor}</span> {a.action}</span>
                <span className="font-mono text-[11px] text-text-tertiary">{relTime(a.at, now)}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function BankTab() {
  return (
    <Card className="overflow-hidden">
      <CardBody className="flex items-center justify-between">
        <CardHead label="Corporate accounts" info="Destinations used when you withdraw from Treasury." />
        <Button size="sm" variant="secondary" leadingIcon={<Plus className="size-3.5" />} onClick={() => toast("Add account", { description: "Verify via penny-drop to add a destination." })}>Add account</Button>
      </CardBody>
      <div className="divide-y divide-border-subtle border-t border-border-subtle">
        {bankAccounts.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-surface-2 text-brand"><Landmark className="size-4" /></span>
            <div className="min-w-[140px] flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">{b.bank}{b.primary && <Pill tone="brand" dot={false}>Primary</Pill>}</div>
              <div className="font-mono text-[11.5px] text-text-tertiary">A/C {b.masked} · {b.ifsc}</div>
            </div>
            {!b.primary && <Button size="sm" variant="ghost" onClick={() => toast("Set as primary")}>Make primary</Button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function BrandTab() {
  const [accent, setAccent] = useState(ACCENTS[0]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <Card>
        <CardBody className="space-y-5">
          <CardHead label="White-label" info="Themes the end-user SEP-24 webview, not this console." />
          <div>
            <div className="eyebrow mb-2">Accent color</div>
            <div className="flex gap-2">
              {ACCENTS.map((c) => (
                <button key={c} onClick={() => setAccent(c)} className={cn("size-9 rounded-full transition-transform", accent === c ? "ring-2 ring-offset-2 ring-offset-surface-1 scale-110" : "hover:scale-105")} style={{ background: c, boxShadow: accent === c ? `0 0 0 2px ${c}` : undefined }}>
                  {accent === c && <Check className="mx-auto size-4 text-[#15131f]" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">Logo</div>
            <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-border-default bg-surface-2/40 px-4 py-4">
              <span className="grid size-11 place-items-center rounded-[10px] bg-surface-3"><Palette className="size-5 text-text-tertiary" /></span>
              <div className="text-[12.5px] text-text-secondary">Drag a PNG/SVG, or <button className="font-medium text-brand" onClick={() => toast("Logo uploaded")}>browse</button></div>
            </div>
          </div>
          <Field label="Webview domain" value="pay.acmepay.in" mono />
          <Button variant="primary" size="sm" onClick={() => toast("Branding saved", { description: "Your SEP-24 webview is themed." })}>Save branding</Button>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <CardHead label="Live preview" info="Exactly what your users see." />
          <div className="mt-4"><WebviewPreview accent={accent} brandName="Acme Pay" /></div>
        </CardBody>
      </Card>
    </div>
  );
}

function NotifTab() {
  const [channels, setChannels] = useState(NOTIFICATION_CHANNELS);
  const toggle = (i: number, key: "email" | "slack" | "inApp") => setChannels((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: !c[key] } : c)));
  return (
    <Card className="overflow-hidden">
      <CardBody><CardHead label="Notification routing" info="Where each alert is delivered." /></CardBody>
      <div className="overflow-x-auto border-t border-border-subtle">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 border-b border-border-subtle bg-sunken/70 px-5 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-tertiary">Alert</span>
            <span className="flex items-center justify-center gap-1 font-mono text-[10.5px] uppercase text-text-tertiary"><Mail className="size-3" /> Email</span>
            <span className="flex items-center justify-center gap-1 font-mono text-[10.5px] uppercase text-text-tertiary"><MessageSquare className="size-3" /> Slack</span>
            <span className="flex items-center justify-center gap-1 font-mono text-[10.5px] uppercase text-text-tertiary"><Monitor className="size-3" /> In-app</span>
          </div>
          {channels.map((c, i) => (
            <div key={c.label} className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 border-b border-border-subtle px-5 py-3 last:border-0">
              <div>
                <div className="text-[13px] font-medium text-text-primary">{c.label}</div>
                <div className="text-[11.5px] text-text-tertiary">{c.desc}</div>
              </div>
              <div className="flex justify-center"><Switch checked={c.email} onCheckedChange={() => toggle(i, "email")} /></div>
              <div className="flex justify-center"><Switch checked={c.slack} onCheckedChange={() => toggle(i, "slack")} /></div>
              <div className="flex justify-center"><Switch checked={c.inApp} onCheckedChange={() => toggle(i, "inApp")} /></div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <Input defaultValue={value} className={cn(mono && "font-mono text-[12.5px]")} />
    </div>
  );
}
