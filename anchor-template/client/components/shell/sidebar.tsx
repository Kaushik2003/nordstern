"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { NAV_PRIMARY, NAV_CONFIG, type NavItem } from "@/lib/nav";
import { BrandMark, Wordmark } from "@/components/brand/mark";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const row = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-brand-fill text-text-primary"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
      )}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-text-tertiary group-hover:text-text-secondary")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tip content={item.label} side="right">
      {row}
    </Tip>
  ) : (
    row
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("ns-sidebar") === "1");
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("ns-sidebar", next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      style={{ width: collapsed ? 68 : 244 }}
      className="sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-border-subtle bg-base/80 backdrop-blur-xl transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex"
    >
      <div className={cn("flex h-14 items-center border-b border-border-subtle", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        <Link href="/overview" aria-label="NordStern">
          {collapsed ? <BrandMark size={26} /> : <Wordmark />}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="grid size-7 place-items-center rounded-[8px] text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <PanelLeftClose className="size-[17px]" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV_PRIMARY.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
        ))}
        <div className={cn("my-2.5 border-t border-border-subtle", collapsed ? "mx-2" : "mx-1")} />
        {NAV_CONFIG.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border-subtle p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button onClick={toggle} aria-label="Expand sidebar" className="grid size-7 place-items-center rounded-[8px] text-text-tertiary hover:bg-surface-2 hover:text-text-primary">
              <PanelLeft className="size-[17px]" />
            </button>
            <Tip content="All systems operational" side="right">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-[dot-pulse_1.8s_ease-in-out_infinite] rounded-full bg-pos" />
                <span className="relative inline-flex size-2 rounded-full bg-pos" />
              </span>
            </Tip>
          </div>
        ) : (
          <Link
            href="/developer"
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[12px] text-text-secondary transition-colors hover:bg-surface-2"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-[dot-pulse_1.8s_ease-in-out_infinite] rounded-full bg-pos" />
              <span className="relative inline-flex size-2 rounded-full bg-pos" />
            </span>
            <span>All systems operational</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const items = [NAV_PRIMARY[0], NAV_PRIMARY[1], NAV_PRIMARY[2], NAV_PRIMARY[3], NAV_PRIMARY[4]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border-subtle bg-base/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
              active ? "text-brand" : "text-text-tertiary",
            )}
          >
            <Icon className="size-[19px]" />
            <span className="max-w-full truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
