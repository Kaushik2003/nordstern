import { getBrand } from '@/lib/brand';
import { Providers } from '../providers';
import { AnchorProvider } from '@/components/anchor-context';
import { ConsoleShell } from '@/components/console-shell';

// Operator console shell. Brand slug/asset come from injected env (server-side);
// the authoritative business name + {orgId, anchorId} come from platform-api's
// resolve endpoint inside AnchorProvider, which also gates auth (401 → /login).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const brand = getBrand();
  return (
    <Providers>
      <AnchorProvider slug={brand.slug} assetCode={brand.assetCode} envName={brand.displayName} logoUrl={brand.logoUrl} network={brand.network}>
        <ConsoleShell>{children}</ConsoleShell>
      </AnchorProvider>
    </Providers>
  );
}
