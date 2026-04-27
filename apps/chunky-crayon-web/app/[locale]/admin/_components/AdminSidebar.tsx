'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faImages,
  faBullhorn,
  faShareNodes,
  faShareFromSquare,
} from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

// Sidebar nav for /admin/*. Each item is a section of the admin shell.
// Add new sections here — order is the visual order in the sidebar.
//
// `match` is a prefix used to highlight the active item: '/admin' is
// exact-only (the dashboard); everything else matches its subtree.
const ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof faGauge;
  match: 'exact' | 'prefix';
}> = [
  { href: '/admin', label: 'Dashboard', icon: faGauge, match: 'exact' },
  { href: '/admin/ads', label: 'Ads', icon: faBullhorn, match: 'prefix' },
  { href: '/admin/images', label: 'Images', icon: faImages, match: 'prefix' },
  {
    href: '/admin/og',
    label: 'OG previews',
    icon: faShareFromSquare,
    match: 'prefix',
  },
  {
    href: '/admin/social',
    label: 'Social',
    icon: faShareNodes,
    match: 'prefix',
  },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  // Strip the [locale] prefix so '/en/admin/ads' matches '/admin/ads'.
  // next-intl always renders the locale segment, even for the default.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-paper-cream-dark bg-white/60 backdrop-blur-sm py-8 px-3">
      <div className="px-3 mb-6">
        <p className="font-rooney-sans text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
          Admin
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon, match }) => {
          const isActive =
            match === 'exact' ? stripped === href : stripped.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-coloring-card font-rooney-sans text-sm font-medium transition-colors',
                isActive
                  ? 'bg-crayon-orange text-white shadow-sm'
                  : 'text-text-secondary hover:bg-paper-cream hover:text-text-primary',
              )}
            >
              <FontAwesomeIcon icon={icon} className="text-base shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
