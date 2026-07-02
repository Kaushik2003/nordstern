'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Overview' },
  { href: '/transactions', label: 'Transactions' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="nav-label">Anchor</div>
      {items.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
            <span className="dot" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
