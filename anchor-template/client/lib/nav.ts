import {
  Gauge,
  ArrowLeftRight,
  Landmark,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  ChartColumnBig,
  Terminal,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  desc: string;
}

export const NAV_PRIMARY: NavItem[] = [
  { label: "Overview", href: "/overview", icon: Gauge, desc: "Mission control" },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, desc: "Money in / money out" },
  { label: "Treasury", href: "/treasury", icon: Landmark, desc: "Balance, reserves & withdraw" },
  { label: "Pricing & Liquidity", href: "/pricing", icon: SlidersHorizontal, desc: "Smart-spread engine" },
  { label: "Users & KYC", href: "/users", icon: Users, desc: "Who is using this anchor" },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck, desc: "AML, sanctions & reporting" },
  { label: "Analytics", href: "/analytics", icon: ChartColumnBig, desc: "Demographics & forecasting" },
];

export const NAV_CONFIG: NavItem[] = [
  { label: "Developer", href: "/developer", icon: Terminal, desc: "Keys, config & webhooks" },
  { label: "Settings & Team", href: "/settings", icon: Settings, desc: "Org, RBAC & branding" },
];

export const ALL_NAV = [...NAV_PRIMARY, ...NAV_CONFIG];
