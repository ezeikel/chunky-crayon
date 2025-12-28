// Export translation resources
import enTranslations from './en.json';
import jaTranslations from './ja.json';
import koTranslations from './ko.json';
import deTranslations from './de.json';
import frTranslations from './fr.json';
import esTranslations from './es.json';

// AI-generated translations for all supported locales
export const translations = {
  en: enTranslations,
  ja: jaTranslations,
  ko: koTranslations,
  de: deTranslations,
  fr: frTranslations,
  es: esTranslations,
} as const;

export const supportedLocales = ['en', 'ja', 'ko', 'de', 'fr', 'es'] as const;
export type SupportedLocale = typeof supportedLocales[number];

// Export individual translations for direct import
export const en = enTranslations;
export const ja = jaTranslations;
export const ko = koTranslations;
export const de = deTranslations;
export const fr = frTranslations;
export const es = esTranslations;

// Type definitions for better TypeScript support
export type Messages = typeof enTranslations;
export type TranslationKeys = keyof typeof enTranslations;

// Helper function to get nested translation keys
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof enTranslations>;

// Default export for convenience
export default translations;
