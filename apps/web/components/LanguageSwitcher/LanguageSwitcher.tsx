'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, type Locale } from '@/i18n/routing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/pro-duotone-svg-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import posthog from 'posthog-js';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

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

type LanguageSwitcherProps = {
  className?: string;
  variant?: 'icon' | 'full' | 'compact';
};

const LanguageSwitcher = ({
  className,
  variant = 'icon',
}: LanguageSwitcherProps) => {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleLocaleChange = (newLocale: Locale) => {
    // Track language change event
    trackEvent(TRACKING_EVENTS.LANGUAGE_CHANGED, {
      fromLocale: locale,
      toLocale: newLocale,
      pathname,
    });

    // Update user property so PostHog always knows current language preference
    posthog.people.set({ locale: newLocale });

    // Pass both pathname and params for dynamic routes like /coloring-image/[id]
    // @ts-expect-error - next-intl router expects specific pathname types but we're using dynamic routes
    router.replace({ pathname, params }, { locale: newLocale });
  };

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 font-tondo font-bold text-text-secondary hover:text-crayon-orange transition-colors focus:outline-none',
          className,
        )}
        aria-label={t('switchLanguage')}
      >
        {variant === 'icon' && (
          <FontAwesomeIcon
            icon={faGlobe}
            className="text-xl"
            style={iconStyle}
          />
        )}
        {variant === 'full' && (
          <>
            <FontAwesomeIcon
              icon={faGlobe}
              className="text-xl"
              style={iconStyle}
            />
            <span>{LANGUAGE_NAMES[locale]}</span>
          </>
        )}
        {variant === 'compact' && (
          <>
            <span className="text-lg">{LANGUAGE_FLAGS[locale]}</span>
            <span className="text-sm uppercase">{locale}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              'flex items-center gap-3 cursor-pointer font-tondo',
              locale === loc && 'bg-crayon-orange/10 text-crayon-orange',
            )}
          >
            <span className="text-lg">{LANGUAGE_FLAGS[loc]}</span>
            <span className="flex-1">{LANGUAGE_NAMES[loc]}</span>
            {locale === loc && (
              <span className="text-crayon-orange text-sm">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
