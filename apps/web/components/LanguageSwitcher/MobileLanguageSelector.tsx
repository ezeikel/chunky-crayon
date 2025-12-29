'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, type Locale } from '@/i18n/routing';
import cn from '@/utils/cn';

// Language display names in their native form
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

// Flag emojis for visual distinction
const LANGUAGE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  ja: '🇯🇵',
  ko: '🇰🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
};

const LOCALES: Locale[] = ['en', 'ja', 'ko', 'de', 'fr', 'es'];

type MobileLanguageSelectorProps = {
  onLanguageChange?: () => void;
};

/**
 * Mobile-optimized language selector that displays all languages
 * as inline tappable buttons instead of a dropdown.
 *
 * Designed for use in mobile menus where dropdowns have z-index
 * issues and poor touch UX.
 */
const MobileLanguageSelector = ({
  onLanguageChange,
}: MobileLanguageSelectorProps) => {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Pass both pathname and params for dynamic routes like /coloring-image/[id]
    // @ts-expect-error - next-intl router expects specific pathname types but we're using dynamic routes
    router.replace({ pathname, params }, { locale: newLocale });

    // Notify parent to close menu after language change
    onLanguageChange?.();
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg">🌐</span>
        <span className="font-tondo font-bold text-sm text-text-secondary">
          {t('language')}
        </span>
      </div>

      {/* Language grid - 3 columns on mobile */}
      <div className="grid grid-cols-3 gap-2">
        {LOCALES.map((loc) => {
          const isActive = locale === loc;

          return (
            <button
              key={loc}
              type="button"
              onClick={() => handleLocaleChange(loc)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 p-3 rounded-xl',
                'font-tondo text-sm transition-all duration-200',
                'active:scale-95 min-h-[60px]',
                isActive
                  ? 'bg-crayon-orange/15 text-crayon-orange ring-2 ring-crayon-orange/30'
                  : 'bg-paper-cream hover:bg-paper-cream-dark text-text-primary',
              )}
              aria-label={`${t('switchTo')} ${LANGUAGE_NAMES[loc]}`}
              aria-pressed={isActive}
            >
              <span className="text-xl leading-none">
                {LANGUAGE_FLAGS[loc]}
              </span>
              <span className="font-bold uppercase text-xs">{loc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileLanguageSelector;
