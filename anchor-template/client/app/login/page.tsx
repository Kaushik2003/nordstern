"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Lock, ShieldAlert, Check, Copy } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const operators = [
    { name: "Ananya Rao", email: "ananya@nordstern.live", role: "Compliance Officer" },
    { name: "Dev Kapoor", email: "dev@nordstern.live", role: "Developer" },
    { name: "Kaushik", email: "kaushik@nordstern.live", role: "Owner" }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        username: email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        toast.error("Login failed", { description: "Please check your credentials." });
      } else {
        toast.success("Welcome back!", { description: "Logged in successfully." });
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyCreds = (op: typeof operators[0], idx: number) => {
    setEmail(op.email);
    setPassword("password123");
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
    toast.success("Credentials filled", { description: `Using profile ${op.name}` });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-base p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-cool/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-12 rounded-[16px] bg-brand-fill border border-brand/20 mb-2">
            <KeyRound className="size-6 text-brand" />
          </div>
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-text-primary">
            NordStern
          </h1>
          <p className="text-[13px] text-text-tertiary">
            Anchor Operations & Management Console
          </p>
        </div>

        <Card className="border border-border-default/60 bg-surface-1/50 backdrop-blur-md">
          <CardBody className="space-y-4 p-6 sm:p-8">
            <div className="space-y-1">
              <h2 className="text-[16px] font-semibold text-text-primary">Sign in</h2>
              <p className="text-[12.5px] text-text-secondary">
                Enter your operator credentials to access the console.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-[10px] border border-crit/25 bg-crit-fill px-3.5 py-2.5 text-[12.5px] text-crit">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="eyebrow">Email address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
                    <Mail className="size-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="operator@nordstern.live"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[10px] border border-border-default bg-sunken py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
                    <Lock className="size-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[10px] border border-border-default bg-sunken py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-dim focus:border-brand focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
                className="mt-2"
              >
                {loading ? "Signing in..." : "Sign in to Console"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Demo profiles quick fill card */}
        <Card className="border border-border-subtle/50 bg-sunken/30">
          <CardBody className="p-4 space-y-3">
            <h3 className="eyebrow text-[10.5px]">Seeded Operator Profiles (Demo)</h3>
            <div className="grid gap-2">
              {operators.map((op, idx) => (
                <button
                  key={op.email}
                  onClick={() => copyCreds(op, idx)}
                  className="flex items-center justify-between text-left rounded-[8px] bg-surface-1/40 hover:bg-surface-2/60 border border-border-subtle px-3 py-2 text-[12px] group transition-all cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-text-secondary">{op.name}</div>
                    <div className="text-[10px] text-text-tertiary">{op.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-brand group-hover:text-brand-300">
                    <span className="text-[10.5px] font-mono">fill</span>
                    {copiedIndex === idx ? (
                      <Check className="size-3.5 text-pos" />
                    ) : (
                      <Copy className="size-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
