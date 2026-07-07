import { getBrand } from '@/lib/brand';
import { Nav } from '@/components/nav';
import { Providers } from '../providers';

// Operator console shell: branded sidebar + top bar. Brand is resolved server-side
// from injected env (getBrand) so one image renders every anchor's identity.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const brand = getBrand();
  const initial = brand.name.charAt(0).toUpperCase();

  return (
    <Providers>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-canvas p-4 lg:flex">
          <div className="mb-8 flex items-center gap-3 px-2 pt-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{brand.name}</p>
              <p className="text-xs text-subtle">Operator Console</p>
            </div>
          </div>
          <Nav />
          <div className="mt-auto rounded-lg border border-line bg-surface p-3">
            <p className="text-xs text-subtle">Asset</p>
            <p className="text-sm font-semibold text-ink">{brand.assetCode}</p>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-line px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">{initial}</div>
              <span className="text-sm font-semibold text-ink">{brand.name}</span>
            </div>
            <div className="ml-auto text-xs text-subtle">
              powered by <span className="font-medium text-ink">NordStern</span>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
