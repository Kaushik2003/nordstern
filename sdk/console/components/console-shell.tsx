'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Nav } from '@/components/nav';
import { useAnchor } from '@/components/anchor-context';
import { api } from '@/lib/api';

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { name, assetCode, logoUrl } = useAnchor();
  const router = useRouter();
  const initial = (name || 'A').charAt(0).toUpperCase();

  // Logo image when configured; else a monogram on the accent (readable text via
  // --color-brand-ink). Never blank.
  const Mark = ({ size }: { size: number }) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={`${name} logo`} className="rounded-lg object-contain" style={{ width: size, height: size }} />
    ) : (
      <div className="flex items-center justify-center rounded-lg bg-brand font-bold text-[var(--color-brand-ink)]" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {initial}
      </div>
    );

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-canvas p-4 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <Mark size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-subtle">Operator Console</p>
          </div>
        </div>
        <Nav />
        <div className="mt-auto space-y-2">
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-xs text-subtle">Asset</p>
            <p className="text-sm font-semibold text-ink">{assetCode}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-subtle transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Mark size={28} />
            <span className="text-sm font-semibold text-ink">{name}</span>
          </div>
          <div className="ml-auto text-xs text-subtle">
            powered by <span className="font-medium text-ink">NordStern</span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
