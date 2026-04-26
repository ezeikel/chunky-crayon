import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faImages,
  faShareNodes,
} from '@fortawesome/pro-duotone-svg-icons';

// Top-level admin landing. Layout already gates this on ADMIN role, so
// no requireAdmin() needed here. Each card links into a section managed
// from the sidebar — keep cards in lockstep with the sidebar's ITEMS
// list so the dashboard stays a useful overview.
const SECTIONS = [
  {
    href: '/admin/ads',
    label: 'Ads',
    icon: faBullhorn,
    description: 'Create and manage paid-ad coloring images served on /start.',
  },
  {
    href: '/admin/images',
    label: 'Images',
    icon: faImages,
    description: 'Browse all coloring images, filter by type/status.',
  },
  {
    href: '/admin/social',
    label: 'Social',
    icon: faShareNodes,
    description: 'Manage Pinterest and TikTok posting tokens.',
  },
];

const AdminDashboardPage = () => {
  return (
    <div>
      <h1 className="font-tondo text-3xl font-bold mb-2">Admin</h1>
      <p className="font-rooney-sans text-text-secondary mb-8">
        Internal tools for managing Chunky Crayon.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, label, icon, description }) => (
          <Link
            key={href}
            href={href}
            className="group block p-5 bg-white rounded-coloring-card border border-paper-cream-dark hover:border-crayon-orange hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <FontAwesomeIcon
                icon={icon}
                className="text-xl text-crayon-orange"
              />
              <h2 className="font-tondo text-lg font-bold text-text-primary">
                {label}
              </h2>
            </div>
            <p className="font-rooney-sans text-sm text-text-secondary">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
