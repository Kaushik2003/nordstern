"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Mail, ShieldAlert, Plus, UserPlus, Check, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useSkeleton } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface Member {
  name: string;
  email: string;
  role: string;
  status: "active" | "invited";
}

export default function SettingsPage() {
  const ready = useSkeleton();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");

  const [members, setMembers] = useState<Member[]>([
    { name: "Kaushik Mandal", email: "kaushik@nordstern.live", role: "Owner", status: "active" },
    { name: "Ananya Sharma", email: "ananya@nordstern.live", role: "Compliance Officer", status: "active" },
    { name: "Dev Patel", email: "dev@nordstern.live", role: "Developer", status: "active" },
    { name: "Kavya Rao", email: "kavya@nordstern.live", role: "Operator", status: "active" },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) {
      toast.error("Please fill in all invite fields");
      return;
    }
    const newMember: Member = {
      name: inviteName,
      email: inviteEmail,
      role: inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1),
      status: "invited",
    };
    setMembers((m) => [...m, newMember]);
    setInviteEmail("");
    setInviteName("");
    toast.success("Invitation sent", { description: `${inviteName} has been invited via email.` });
  };

  const handleRemove = (email: string) => {
    setMembers((m) => m.filter((member) => member.email !== email));
    toast.success("Team member removed");
  };

  if (!ready) return <SettingsSkeleton />;

  return (
    <PageContainer>
      <PageHeader 
        title="Settings & Team" 
        subtitle="Manage your organization profile, invite team members, and configure roles."
      />

      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Org Profile */}
          <Card>
            <CardBody className="space-y-4">
              <CardHead label="Organization profile" info="Basic identity parameters of your anchor anchor entity." />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="eyebrow">Organization Name</label>
                  <Input defaultValue="Acme Pay" className="mt-1" readOnly />
                </div>
                <div>
                  <label className="eyebrow">Associated Domain</label>
                  <Input defaultValue="acmepay.in" className="mt-1" readOnly />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="eyebrow">Settlement Bank Account</label>
                  <Input defaultValue="HDFC Bank Escrow (•••• 9876)" className="mt-1" readOnly />
                </div>
                <div>
                  <label className="eyebrow">Regulatory License Reference</label>
                  <Input defaultValue="RBI-VDA-2026-N8" className="mt-1" readOnly />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Members List */}
          <Card>
            <CardBody className="space-y-4">
              <CardHead label="Team Members & Roles" info="View and manage active console operators." />
              <div className="divide-y divide-border-subtle">
                {members.map((m) => (
                  <div key={m.email} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} initials={m.name.split(" ").map(n => n[0]).join("")} size={36} />
                      <div>
                        <div className="text-[13.5px] font-medium text-text-primary">
                          {m.name}
                          {m.status === "invited" && (
                            <span className="ml-2 rounded-full bg-warn/10 px-2 py-0.5 font-mono text-[9px] text-warn">INVITED</span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-text-tertiary">{m.email} · {m.role}</div>
                      </div>
                    </div>
                    {m.role !== "Owner" && (
                      <button 
                        onClick={() => handleRemove(m.email)}
                        className="rounded-[8px] p-1.5 text-text-tertiary transition-colors hover:bg-crit-fill hover:text-crit"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          {/* Invite Form */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-brand" />
                <CardHead label="Invite Operator" />
              </div>
              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <label className="eyebrow">Name</label>
                  <Input 
                    type="text" 
                    placeholder="Enter full name" 
                    value={inviteName} 
                    onChange={(e) => setInviteName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="eyebrow">Email Address</label>
                  <Input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={inviteEmail} 
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="eyebrow">Role Definition</label>
                  <select 
                    value={inviteRole} 
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 w-full rounded-[10px] border border-border-subtle bg-surface-1 px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-default"
                  >
                    <option value="operator">Operator</option>
                    <option value="compliance">Compliance Officer</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-full mt-2" leadingIcon={<Plus className="size-4" />}>
                  Send Invite Link
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="mt-4">
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2 text-text-secondary">
                <ShieldAlert className="size-4" />
                <span className="text-[12.5px] font-medium text-text-primary">Role Permissions Policy</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-text-secondary">
                Access to the cryptographic audit trail, developer credentials, and manual transaction retry tools is restricted based on RBAC scope.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function SettingsSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-5 h-7 w-32" />
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-[14px]" />
          <Skeleton className="h-64 w-full rounded-[14px]" />
        </div>
        <Skeleton className="h-80 w-full rounded-[14px]" />
      </div>
    </PageContainer>
  );
}
