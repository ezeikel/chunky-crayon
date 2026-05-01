import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSitemap,
  faBaby,
  faChildReaching,
  faGamepad,
  faPalette,
  faStar,
  faStars,
  faMedal,
  faCrown,
} from '@fortawesome/pro-duotone-svg-icons';
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
  links: { label: ReactNode; href: string }[];
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
        {
          label: (
            <>
              <FontAwesomeIcon icon={faBaby} className="text-crayon-purple" />
              <span>For Toddlers (Ages 2-4)</span>
            </>
          ),
          href: '/gallery/for-toddlers',
        },
        {
          label: (
            <>
              <FontAwesomeIcon
                icon={faChildReaching}
                className="text-crayon-orange"
              />
              <span>For Kids (Ages 4-12)</span>
            </>
          ),
          href: '/gallery/for-kids',
        },
        {
          label: (
            <>
              <FontAwesomeIcon icon={faGamepad} className="text-crayon-blue" />
              <span>For Teens (Ages 13-17)</span>
            </>
          ),
          href: '/gallery/for-teens',
        },
        {
          label: (
            <>
              <FontAwesomeIcon icon={faPalette} className="text-crayon-green" />
              <span>For Adults (18+)</span>
            </>
          ),
          href: '/gallery/for-adults',
        },
      ],
    },
    {
      title: 'Browse by Difficulty',
      links: [
        {
          label: (
            <>
              <FontAwesomeIcon icon={faStar} className="text-crayon-green" />
              <span>Beginner (Easy)</span>
            </>
          ),
          href: '/gallery/difficulty/beginner',
        },
        {
          label: (
            <>
              <FontAwesomeIcon icon={faStars} className="text-crayon-orange" />
              <span>Intermediate (Medium)</span>
            </>
          ),
          href: '/gallery/difficulty/intermediate',
        },
        {
          label: (
            <>
              <FontAwesomeIcon icon={faMedal} className="text-crayon-blue" />
              <span>Advanced (Hard)</span>
            </>
          ),
          href: '/gallery/difficulty/advanced',
        },
        {
          label: (
            <>
              <FontAwesomeIcon icon={faCrown} className="text-crayon-purple" />
              <span>Expert (Very Hard)</span>
            </>
          ),
          href: '/gallery/difficulty/expert',
        },
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
        label: (
          <>
            <FontAwesomeIcon icon={category.icon} className={category.color} />
            <span>{category.name} Coloring Pages</span>
          </>
        ),
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
