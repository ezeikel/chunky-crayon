'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, type Locale } from '@/i18n/routing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-duotone-svg-icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
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

const LanguageSettings = () => {
  const t = useTranslations('settings');
  const tLang = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Pass both pathname and params for dynamic routes
    // @ts-expect-error - next-intl router expects specific pathname types but we're using dynamic routes
    router.replace({ pathname, params }, { locale: newLocale });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🌐</span>
          <span>{t('languagePreference.title')}</span>
        </CardTitle>
        <CardDescription>{t('languagePreference.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Language grid - 3 columns on mobile, 6 on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {LOCALES.map((loc) => {
            const isActive = locale === loc;

            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleLocaleChange(loc)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                  'font-tondo transition-all duration-200',
                  'active:scale-95 min-h-[80px]',
                  isActive
                    ? 'bg-crayon-orange/15 text-crayon-orange ring-2 ring-crayon-orange'
                    : 'bg-paper-cream hover:bg-paper-cream-dark text-text-primary hover:ring-2 hover:ring-paper-cream-dark',
                )}
                aria-label={`${tLang('switchTo')} ${LANGUAGE_NAMES[loc]}`}
                aria-pressed={isActive}
              >
                {/* Checkmark for active language */}
                {isActive && (
                  <span className="absolute top-2 right-2">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="text-xs text-crayon-orange"
                    />
                  </span>
                )}
                <span className="text-2xl leading-none">
                  {LANGUAGE_FLAGS[loc]}
                </span>
                <span className="font-bold text-sm">{LANGUAGE_NAMES[loc]}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageSettings;
