'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Book, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Nav } from '@/components/nav';
import { useAnchor } from '@/components/anchor-context';
import { api, bizGet } from '@/lib/api';
import { cn } from '@/lib/cn';

// Operator console shell — a collapsible dark rail + brand/environment top bar, matching the
// landing console mock. The rail carries the NORDSTERN mark (the console is a NordStern product);
// the anchor's own name/logo live in the top bar. The console ALWAYS uses NordStern's palette.
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { name, assetCode, logoUrl: envLogo, network } = useAnchor();
  const router = useRouter();
  const isMainnet = network === 'mainnet' || network === 'public';
  // Prefer the operator's live logo override (Settings) over the provisioned env logo.
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => bizGet<{ logoUrl: string | null }>('/admin/settings'), staleTime: 30000 });
  const logoUrl = settings?.logoUrl ?? envLogo;

  // Expand/collapse, remembered across visits.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(localStorage.getItem('ns:rail') === 'open'); }, []);
  function toggle() {
    setExpanded((v) => { const n = !v; localStorage.setItem('ns:rail', n ? 'open' : 'closed'); return n; });
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    router.replace('/login');
  }

  const AnchorMark = ({ size }: { size: number }) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={`${name} logo`} className="rounded-lg object-contain" style={{ width: size, height: size }} />
    ) : (
      <div className="grid place-items-center rounded-lg bg-brand font-semibold text-[var(--color-brand-ink)]" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {(name || 'A').charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div className="flex min-h-screen bg-[#f4f4f8]">
      {/* Collapsible dark rail */}
      <aside
        className={cn(
          'sticky top-0 z-30 hidden h-screen shrink-0 flex-col justify-between bg-noir py-5 transition-[width] duration-200 ease-out lg:flex',
          expanded ? 'w-[228px] px-4' : 'w-[68px] items-center',
        )}
      >
        <div className={cn('flex flex-col gap-4', !expanded && 'items-center')}>
          {/* NordStern brand + collapse toggle */}
          <div className={cn('flex items-center', expanded ? 'justify-between' : 'flex-col gap-3')}>
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nordstern-light.png" alt="NordStern" className="size-8 object-contain" />
              {expanded && <span className="text-[15px] font-semibold tracking-tight text-white">NordStern</span>}
            </span>
            <button onClick={toggle} title={expanded ? 'Collapse' : 'Expand'} className="grid size-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80">
              {expanded ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
            </button>
          </div>
          <Nav expanded={expanded} />
        </div>

        <div className={cn('flex flex-col gap-1.5', !expanded && 'items-center')}>
          <RailBtn expanded={expanded} icon={<Book className="h-[18px] w-[18px]" />} label="Docs" onClick={() => {}} />
          <span className={cn('my-1 h-px rounded-full bg-white/10', expanded ? 'w-full' : 'w-6')} />
          <RailBtn expanded={expanded} icon={<LogOut className="h-[18px] w-[18px]" />} label="Sign out" onClick={logout} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — anchor brand, environment, network/asset */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.05] bg-white/70 px-6 py-3.5 backdrop-blur">
          <span className="flex items-center gap-2 lg:hidden"><AnchorMark size={26} /></span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">{name}</span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide', isMainnet ? 'bg-[color:var(--color-up)]/12 text-[color:var(--color-up)]' : 'bg-[#f6eccf] text-[#8a6410]')}>
            <span className={cn('size-1.5 rounded-full', isMainnet ? 'bg-[color:var(--color-up)]' : 'bg-[#c9992e]')} />
            {isMainnet ? 'MAINNET' : 'TESTNET'}
          </span>
          <span className="hidden rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline">
            Stellar · {assetCode}
          </span>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-subtle">
            powered by <span className="font-semibold text-ink">NordStern</span>
          </div>
        </header>
        {/* Uniform gutter on every side of every page — content fills the width. */}
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function RailBtn({ expanded, icon, label, onClick }: { expanded: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'group flex items-center rounded-[13px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80',
        expanded ? 'w-full gap-3 px-3 py-2 text-[13px] font-medium' : 'size-10 justify-center',
      )}
    >
      {icon}
      {expanded && <span>{label}</span>}
    </button>
  );
}
