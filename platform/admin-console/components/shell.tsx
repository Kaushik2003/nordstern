'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@nordstern/shared-auth';
import { Button, cn } from '@nordstern/shared-ui';
import { LogOut, ShieldCheck } from 'lucide-react';
import { navSections } from '@/lib/nav';
import { Spinner } from '@/components/primitives';

function SidebarLink({ href, label, icon: Icon, state }: (typeof navSections)[number]['items'][number]) {
  const pathname = usePathname();
  // `/` must match exactly or it lights up on every route.
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
      <span className="flex-1 truncate">{label}</span>
      {state !== 'live' && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', state === 'unwired' ? 'bg-warn' : 'bg-muted-foreground/30')}
          title={state === 'unwired' ? 'Data exists but is not wired up' : 'No backend yet'}
        />
      )}
    </Link>
  );
}

/**
 * The authenticated admin shell: session guard + persistent sidebar.
 *
 * Guard runs once per mount against `/admin/me`; a 401 bounces to /login. The admin realm
 * has no refresh token (shared-auth skips refresh for `/admin/*`), so an expired cookie
 * means re-authenticating.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<{ username: string }>('/admin/me');
        setUsername(me.username);
        setChecked(true);
      } catch (err) {
        if (err instanceof ApiError && err.status !== 401) setChecked(true);
        else router.replace('/login');
      }
    })();
  }, [router]);

  async function signOut() {
    try { await api.post('/admin/logout'); } catch { /* the cookie is going away regardless */ }
    router.replace('/login');
  }

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-surface"><Spinner /></div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-card lg:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-none text-foreground">NordStern</div>
            <div className="mt-1 text-xs text-muted-foreground">Internal admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => <SidebarLink key={item.href} {...item} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface/50 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{username ?? 'admin'}</div>
              <div className="text-xs text-muted-foreground">Staff session</div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Mobile header — the sidebar is desktop-only; this keeps sign-out reachable. */}
        <header className="flex h-14 items-center justify-between border-b border-line bg-background px-4 lg:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />NordStern Admin
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>

        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
