/**
 * Single source of truth for supported locales.
 *
 * To add a new language:
 * 1. Add entry to LOCALES array below
 * 2. Add export to package.json: "./xx": { "import": "./src/xx.json", "require": "./src/xx.json" }
 * 3. Add to GitHub Action matrix in .github/workflows/translation-review.yml
 * 4. Run: pnpm translate
 *
 * That's it! All scripts import from this file.
 */

export const LOCALES = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
export type LocaleInfo = (typeof LOCALES)[number];

/** All locale codes including English */
export const ALL_LOCALE_CODES = ["en", ...LOCALES.map((l) => l.code)] as const;
export type AllLocaleCode = (typeof ALL_LOCALE_CODES)[number];

/** Default/source locale */
export const SOURCE_LOCALE = "en" as const;
