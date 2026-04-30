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

const Footer = async ({ className }: FooterProps) => {
  const [t, tAlt, year] = await Promise.all([
    getTranslations('footer'),
    getTranslations('altText'),
    getCachedYear(),
  ]);

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
              aria-label="Chunky Crayon — home"
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
              {t('brand')}
            </Link>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">{t('sections.about')}</h3>
            <p className="text-gray-300 text-base max-w-xs">
              {t('aboutText')}{' '}
              <span className="font-bold text-white">{t('tagline')}</span>
            </p>
          </div>
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">{t('sections.connect')}</h3>
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
          <AppStoreSection label={t('sections.getTheApp')} />
        </div>
        <div className="flex-1 min-w-[220px] flex flex-col gap-8">
          <div>
            <h3 className="font-tondo font-bold text-lg mb-2">
              {t('newsletter.title')}
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-sm">
              {t('newsletter.subtitle')}
            </p>
            <Suspense fallback={null}>
              <JoinColoringPageEmailListForm location="footer" />
            </Suspense>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">{t('sections.support')}</h3>
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
                  {t('links.colorAsYouGo')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Free Tools — internal linking for SEO + discoverability */}
          <div>
            <h3 className="font-bold text-lg mb-2">Free Tools</h3>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link
                  href="/tools"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  All tools
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/name"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  Name coloring pages
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/reward-chart"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  Reward chart maker
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/birthday-invite"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  Birthday invite maker
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/abc-tracing"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  ABC tracing worksheets
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/seasonal-pack"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  Seasonal coloring packs
                </Link>
              </li>
              <li>
                <Link
                  href="/for-teachers"
                  className="text-gray-300 text-base hover:text-white transition-colors"
                >
                  For teachers
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 pt-6 text-gray-400 text-sm gap-2">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>{t('copyright', { year })}</span>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              {t('links.privacyPolicy')}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {t('links.termsOfService')}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Colo waving goodbye */}
          <Image
            src="/images/colo.svg"
            alt={tAlt('mascot')}
            width={40}
            height={40}
            className="opacity-80 hover:opacity-100 transition-opacity"
          />
          <span>
            {t.rich('madeBy', {
              heart: (chunks) => (
                <span className="text-[#FF8A65] font-bold text-lg">
                  {chunks}
                </span>
              ),
              location: (chunks) => (
                <span className="text-white font-bold">{chunks}</span>
              ),
            })}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
