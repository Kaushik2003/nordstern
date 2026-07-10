'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Book, Settings as Gear } from 'lucide-react';
import { Nav } from '@/components/nav';
import { useAnchor } from '@/components/anchor-context';
import { api } from '@/lib/api';

// Operator console shell — slim dark icon rail + brand/environment top bar, matching the
// landing console mock. The console ALWAYS uses NordStern's default palette (never the
// per-anchor accent): the anchor's logo appears, but the accent stays NordStern purple.
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { name, assetCode, logoUrl, network } = useAnchor();
  const router = useRouter();
  const initial = (name || 'A').charAt(0).toUpperCase();
  const isMainnet = network === 'mainnet' || network === 'public';

  const Mark = ({ size }: { size: number }) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={`${name} logo`} className="rounded-lg object-contain" style={{ width: size, height: size }} />
    ) : (
      <div className="grid place-items-center rounded-lg bg-brand font-bold text-[var(--color-brand-ink)]" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {initial}
      </div>
    );

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f8]">
      {/* Slim dark icon rail */}
      <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center justify-between bg-noir py-5 lg:flex">
        <div className="flex flex-col items-center gap-3">
          <Mark size={34} />
          <div className="mt-1"><Nav /></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[13px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80" title="Docs"><Book className="h-[18px] w-[18px]" /></span>
          <span className="my-1 h-px w-6 rounded-full bg-white/10" />
          <button onClick={logout} title="Sign out" className="grid size-10 place-items-center rounded-[13px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — anchor brand, environment, network/asset */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/[0.05] bg-white/70 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden"><Mark size={26} /></div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">{name}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${isMainnet ? 'bg-[color:var(--color-up)]/12 text-[color:var(--color-up)]' : 'bg-[#f6eccf] text-[#8a6410]'}`}>
            <span className={`size-1.5 rounded-full ${isMainnet ? 'bg-[color:var(--color-up)]' : 'bg-[#c9992e]'}`} />
            {isMainnet ? 'MAINNET' : 'TESTNET'}
          </span>
          <span className="hidden rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline">
            Stellar · {assetCode}
          </span>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-subtle">
            powered by <span className="font-semibold text-ink">NordStern</span>
          </div>
        </header>
        <main className="flex-1 p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
