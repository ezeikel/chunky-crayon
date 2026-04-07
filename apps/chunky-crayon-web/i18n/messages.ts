import { translations, mergeMessages } from '@one-colored-pixel/translations';
import type { SupportedLocale } from '@one-colored-pixel/translations';
import enOverrides from '@/messages/en.json';
import jaOverrides from '@/messages/ja.json';
import koOverrides from '@/messages/ko.json';
import deOverrides from '@/messages/de.json';
import frOverrides from '@/messages/fr.json';
import esOverrides from '@/messages/es.json';

const ccOverrides: Record<string, Record<string, unknown>> = {
  en: enOverrides,
  ja: jaOverrides,
  ko: koOverrides,
  de: deOverrides,
  fr: frOverrides,
  es: esOverrides,
};

/**
 * Get merged translations (shared + CC overrides) for a given locale.
 * Use this in server-side code like OG images that can't use next-intl's getMessages().
 */
export function getTranslationsForLocale(locale: string) {
  const validLocale = locale in translations ? locale : 'en';
  const shared = translations[validLocale as SupportedLocale];
  const overrides = ccOverrides[validLocale] || {};
  return mergeMessages(shared as Record<string, unknown>, overrides);
}
