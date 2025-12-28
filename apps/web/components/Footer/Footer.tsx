import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getTranslations } from 'next-intl/server';
import { cacheLife } from 'next/cache';
import cn from '@/utils/cn';
import { SOCIAL_LINKS } from '@/constants';
import AppStoreButtons from '@/components/AppStoreButtons';

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
      className={cn('bg-[#2f2f2f] text-white pt-12 pb-6 px-4 mt-auto', className)}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 md:gap-0">
        <div className="flex-1 min-w-[220px] flex flex-col gap-8">
          <div className="mb-4">
            <Link
              href="/"
              className="text-4xl font-bold"
              style={{ fontFamily: 'Tondo, sans-serif' }}
            >
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
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">{t('sections.getTheApp')}</h3>
            <AppStoreButtons location="footer" />
          </div>
        </div>
        <div className="flex-1 min-w-[220px] flex flex-col gap-8 justify-center md:items-end">
          <div>
            <h3 className="font-bold text-lg mb-2">{t('sections.support')}</h3>
            <a
              href="mailto:support@chunkycrayon.com"
              className="text-gray-300 text-base hover:text-white transition-colors"
            >
              support@chunkycrayon.com
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 pt-6 text-gray-400 text-sm gap-2">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>{t('copyright', { year })}</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">
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
            {t('madeBy')}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
