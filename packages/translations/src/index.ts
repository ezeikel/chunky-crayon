// Export translation resources
import enTranslations from "./en.json";
import jaTranslations from "./ja.json";
import koTranslations from "./ko.json";
import deTranslations from "./de.json";
import frTranslations from "./fr.json";
import esTranslations from "./es.json";

// AI-generated translations for all supported locales
export const translations = {
  en: enTranslations,
  ja: jaTranslations,
  ko: koTranslations,
  de: deTranslations,
  fr: frTranslations,
  es: esTranslations,
} as const;

export const supportedLocales = ["en", "ja", "ko", "de", "fr", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

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

/**
 * Deep merge shared translations with app-specific overrides.
 * Override values win when both exist for the same key.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeMessages(
  shared: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...shared };
  for (const key of Object.keys(overrides)) {
    if (isPlainObject(result[key]) && isPlainObject(overrides[key])) {
      result[key] = mergeMessages(
        result[key] as Record<string, unknown>,
        overrides[key] as Record<string, unknown>,
      );
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

// Default export for convenience
export default translations;
