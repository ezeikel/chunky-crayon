import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSitemap } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';

export const metadata: Metadata = {
  title: 'Sitemap - Chunky Crayon',
  description:
    'Browse all pages on Chunky Crayon. Find coloring pages by category, daily pages, blog posts, and more.',
  robots: {
    index: true,
    follow: true,
  },
};

type SitemapSection = {
  title: string;
  links: { label: string; href: string }[];
};

const SitemapPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const sections: SitemapSection[] = [
    {
      title: 'Main Pages',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Gallery', href: '/gallery' },
        { label: 'Daily Coloring Pages', href: '/gallery/daily' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Blog', href: '/blog' },
      ],
    },
    {
      title: 'Browse by Age',
      links: [
        { label: '👶 For Toddlers (Ages 2-4)', href: '/gallery/for-toddlers' },
        { label: '👦 For Kids (Ages 4-12)', href: '/gallery/for-kids' },
        { label: '🎮 For Teens (Ages 13-17)', href: '/gallery/for-teens' },
        { label: '🎨 For Adults (18+)', href: '/gallery/for-adults' },
      ],
    },
    {
      title: 'Browse by Difficulty',
      links: [
        { label: '⭐ Beginner (Easy)', href: '/gallery/difficulty/beginner' },
        {
          label: '🌟 Intermediate (Medium)',
          href: '/gallery/difficulty/intermediate',
        },
        { label: '🏅 Advanced (Hard)', href: '/gallery/difficulty/advanced' },
        { label: '👑 Expert (Very Hard)', href: '/gallery/difficulty/expert' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
    {
      title: 'Coloring Page Categories',
      links: GALLERY_CATEGORIES.map((category) => ({
        label: `${category.emoji} ${category.name} Coloring Pages`,
        href: `/gallery/${category.slug}`,
      })),
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign In', href: '/sign-in' },
        { label: 'Sign Up', href: '/sign-up' },
        { label: 'My Account', href: '/account' },
      ],
    },
  ];

  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Sitemap' }]}
        className="mb-6"
      />

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faSitemap}
            className="text-3xl md:text-4xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Sitemap
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Find all pages on Chunky Crayon. Browse our free coloring pages by
          category, check out our daily pages, or explore our blog.
        </p>
      </div>

      {/* Sitemap Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="font-tondo font-bold text-xl text-text-primary mb-4 pb-2 border-b-2 border-paper-cream-dark">
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-secondary hover:text-crayon-orange transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* XML Sitemap Link */}
      <div className="mt-16 pt-8 border-t border-paper-cream-dark text-center">
        <p className="text-sm text-text-tertiary">
          For search engines, view our{' '}
          <a
            href="/sitemap.xml"
            className="text-crayon-orange hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            XML Sitemap
          </a>
        </p>
      </div>
    </PageWrap>
  );
};

export default SitemapPage;
