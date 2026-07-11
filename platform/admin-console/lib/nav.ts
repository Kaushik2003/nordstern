import type { LucideIcon } from 'lucide-react';
import {
  Activity, BadgeIndianRupee, Bell, Building2, FileText, Gauge, Inbox, KeyRound,
  LayoutDashboard, ListChecks, ScrollText, Server, ShieldAlert, Users, Wallet,
} from 'lucide-react';

/**
 * `live`      — reads real data from the platform database.
 * `unwired`   — the data exists (control-plane / aggregator) but no proxy reaches it yet.
 * `no-backend`— nothing persists this data anywhere; the page is a design placeholder.
 *
 * Anything not `live` renders a scaffold notice instead of numbers. We never fabricate
 * data to fill a screen. See docs/Admin_Guide/ADMIN_CONSOLE_ROADMAP.md.
 */
export type NavState = 'live' | 'unwired' | 'no-backend';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  state: NavState;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Oversight',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard, state: 'live' },
      { href: '/applications', label: 'Applications', icon: Inbox, state: 'live' },
      { href: '/audit', label: 'Audit log', icon: ScrollText, state: 'live' },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { href: '/anchors', label: 'Anchors', icon: Server, state: 'live' },
      { href: '/provisioning', label: 'Provisioning', icon: ListChecks, state: 'live' },
      { href: '/health', label: 'Anchor health', icon: Gauge, state: 'unwired' },
      { href: '/alerts', label: 'Reconciliation', icon: ShieldAlert, state: 'unwired' },
    ],
  },
  {
    title: 'Tenants',
    items: [
      { href: '/organizations', label: 'Organizations', icon: Building2, state: 'live' },
      { href: '/users', label: 'Operators', icon: Users, state: 'live' },
      { href: '/customers', label: 'Customers', icon: Wallet, state: 'live' },
      { href: '/compliance', label: 'Compliance', icon: FileText, state: 'unwired' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/credentials', label: 'Credentials', icon: KeyRound, state: 'live' },
      { href: '/billing', label: 'Billing', icon: BadgeIndianRupee, state: 'no-backend' },
      { href: '/infrastructure', label: 'Infrastructure', icon: Activity, state: 'no-backend' },
      { href: '/notifications', label: 'Notifications', icon: Bell, state: 'no-backend' },
    ],
  },
];
