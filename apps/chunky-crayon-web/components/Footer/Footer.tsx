import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getTranslations } from 'next-intl/server';
import { cacheLife } from 'next/cache';
import cn from '@/utils/cn';
import { SOCIAL_LINKS } from '@/constants';
import AppStoreSection from '@/components/AppStoreSection';
import JoinColoringPageEmailListForm from '@/components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';

// Cache the year calculation separately from translations
const getCachedYear = async () => {
  'use cache';
  cacheLife('days');
  return new Date().getFullYear();
};

type FooterProps = {
  className?: string;
};

export type FooterContentCopy = {
  brand: string;
  tagline: string;
  aboutText: string;
  mascotAlt: string;
  copyright: string;
  madeByPrefix: string;
  madeByHeart: string;
  madeByLocationPrefix: string;
  madeByLocation: string;
  sections: {
    about: string;
    connect: string;
    getTheApp: string;
    support: string;
    freeTools: string;
  };
  newsletter: {
    title: string;
    subtitle: string;
  };
  links: {
    privacyPolicy: string;
    termsOfService: string;
    support: string;
    colorAsYouGo: string;
  };
  freeTools: {
    allTools: string;
    nameColoringPages: string;
    rewardChartMaker: string;
    birthdayInviteMaker: string;
    abcTracingWorksheets: string;
    seasonalColoringPacks: string;
    forTeachers: string;
  };
};

export const FooterContent = ({
  className,
  copy,
}: FooterProps & { copy: FooterContentCopy }) => {
  return (
    <footer
      className={cn(
        'bg-[#2f2f2f] text-white pt-12 pb-6 px-6 sm:px-8 mt-auto',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 md:gap-16">
        <div className="flex-1 min-w-[220px] flex flex-col gap-8">
          <div className="mb-4">
            <Link
              href="/"
              aria-label="Chunky Crayon home"
              className="inline-flex items-center gap-3 text-4xl font-bold"
              style={{ fontFamily: 'Tondo, sans-serif' }}
            >
              {/* Same lockup as header + Meta ads. Slightly bigger mark
                  here since the footer isn't space-constrained. */}
              <Image
                src="/logos/cc-logo-no-bg.svg"
                alt=""
                width={44}
                height={44}
                className="w-10 h-10 md:w-11 md:h-11 shrink-0"
              />
              {copy.brand}
            </Link>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">{copy.sections.about}</h3>
            <p className="text-gray-300 text-base max-w-xs">
              {copy.aboutText}{' '}
              <span className="font-bold text-white">{copy.tagline}</span>
            </p>
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">{copy.sections.connect}</h3>
            <ul className="flex gap-6 mt-2">
              {SOCIAL_LINKS.map(({ id, label, href, icon }) => (
                <li key={id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                    aria-label={`${label} link`}
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      size="2x"
                      className="fill-gray-400 group-hover:text-crayon-orange group-hover:transition-colors group-hover:duration-300 group-hover:fill-crayon-orange group-hover:ease-in-out"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <AppStoreSection label={copy.sections.getTheApp} />
        </div>
        <div className="flex-1 min-w-[220px] flex flex-col gap-8">
          <div>
            <h3 className="font-tondo font-bold text-lg mb-2">
              {copy.newsletter.title}
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-sm">
              {copy.newsletter.subtitle}
            </p>
            <Suspense fallback={null}>
              <JoinColoringPageEmailListForm location="footer" />
            </Suspense>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">{copy.sections.support}</h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <a
                  href="mailto:support@chunkycrayon.com"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  support@chunkycrayon.com
                </a>
              </li>
              <li>
                <Link
                  href="/color-as-you-go"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.links.colorAsYouGo}
                </Link>
              </li>
            </ul>
          </div>

          {/* Coloring page collections — internal-linking surface so
              Google can discover the long-tail /coloring-pages/ landings
              without relying on sitemap-only crawl. The landings
              themselves are the SEO entry points; this is the back-link. */}
          <div>
            <h3 className="font-bold text-lg mb-2">Coloring Pages</h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link
                  href="/coloring-pages"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  All collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Free Tools — internal linking for SEO + discoverability */}
          <div>
            <h3 className="font-bold text-lg mb-2">
              {copy.sections.freeTools}
            </h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link
                  href="/freebies"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.allTools}
                </Link>
              </li>
              <li>
                <Link
                  href="/freebies/name"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.nameColoringPages}
                </Link>
              </li>
              <li>
                <Link
                  href="/freebies/reward-chart"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.rewardChartMaker}
                </Link>
              </li>
              <li>
                <Link
                  href="/freebies/birthday-invite"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.birthdayInviteMaker}
                </Link>
              </li>
              <li>
                <Link
                  href="/freebies/abc-tracing"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.abcTracingWorksheets}
                </Link>
              </li>
              <li>
                <Link
                  href="/freebies/seasonal-pack"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.seasonalColoringPacks}
                </Link>
              </li>
              <li>
                <Link
                  href="/for-teachers"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  {copy.freeTools.forTeachers}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 pt-6 text-gray-400 text-sm gap-2">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>{copy.copyright}</span>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              {copy.links.privacyPolicy}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {copy.links.termsOfService}
            </Link>
            <Link
              href="/support"
              className="hover:text-white transition-colors"
            >
              {copy.links.support}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Colo waving goodbye */}
          <Image
            src="/images/colo.svg"
            alt={copy.mascotAlt}
            width={40}
            height={40}
            className="opacity-80 hover:opacity-100 transition-opacity"
          />
          <span>
            {copy.madeByPrefix}{' '}
            <span className="text-[#FF8A65] font-bold text-lg">
              {copy.madeByHeart}
            </span>{' '}
            {copy.madeByLocationPrefix}{' '}
            <span className="text-white font-bold">{copy.madeByLocation}</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

const Footer = async ({ className }: FooterProps) => {
  const [t, tAlt, year] = await Promise.all([
    getTranslations('footer'),
    getTranslations('altText'),
    getCachedYear(),
  ]);

  return (
    <FooterContent
      className={className}
      copy={{
        brand: t('brand'),
        tagline: t('tagline'),
        aboutText: t('aboutText'),
        mascotAlt: tAlt('mascot'),
        copyright: t('copyright', { year }),
        madeByPrefix: 'Made with',
        madeByHeart: '♡',
        madeByLocationPrefix: 'in',
        madeByLocation: 'South London',
        sections: {
          about: t('sections.about'),
          connect: t('sections.connect'),
          getTheApp: t('sections.getTheApp'),
          support: t('sections.support'),
          freeTools: t('sections.freeTools'),
        },
        newsletter: {
          title: t('newsletter.title'),
          subtitle: t('newsletter.subtitle'),
        },
        links: {
          privacyPolicy: t('links.privacyPolicy'),
          termsOfService: t('links.termsOfService'),
          support: t('links.support'),
          colorAsYouGo: t('links.colorAsYouGo'),
        },
        freeTools: {
          allTools: t('freeTools.allTools'),
          nameColoringPages: t('freeTools.nameColoringPages'),
          rewardChartMaker: t('freeTools.rewardChartMaker'),
          birthdayInviteMaker: t('freeTools.birthdayInviteMaker'),
          abcTracingWorksheets: t('freeTools.abcTracingWorksheets'),
          seasonalColoringPacks: t('freeTools.seasonalColoringPacks'),
          forTeachers: t('freeTools.forTeachers'),
        },
      }}
    />
  );
};

export default Footer;
