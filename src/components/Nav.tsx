'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Feed', match: (p: string) => p === '/' || p.startsWith('/demo') && !p.includes('/stats') && !p.includes('/settings') && !p.includes('/item') },
  { href: '/stats', label: 'Stats', match: (p: string) => p.includes('/stats') },
  { href: '/settings', label: 'Settings', match: (p: string) => p.includes('/settings') },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-surface-0">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-8">
        <Link href="/" className="font-bold text-accent tracking-tight text-sm font-mono shadow-[var(--shadow-neu-sm)] rounded-xl px-4 py-2 bg-surface-0">
          C2A
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm px-4 py-2 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-accent font-semibold shadow-[var(--shadow-neu-inset)]'
                    : 'text-text-secondary hover:text-text-primary hover:shadow-[var(--shadow-neu-sm)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
