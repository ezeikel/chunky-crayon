const BASE_URL = "https://coloringhabitat.com";
const LOCALES = [
  "en",
  "ja",
  "ko",
  "de",
  "fr",
  "es",
  "zh-Hans",
  "zh-Hant",
] as const;

/**
 * Generate alternates object for Next.js metadata with canonical and hreflang tags.
 */
export function generateAlternates(locale: string, pagePath: string) {
  return {
    canonical: `${BASE_URL}/${locale}${pagePath}`,
    languages: {
      en: `${BASE_URL}/en${pagePath}`,
      ja: `${BASE_URL}/ja${pagePath}`,
      ko: `${BASE_URL}/ko${pagePath}`,
      de: `${BASE_URL}/de${pagePath}`,
      fr: `${BASE_URL}/fr${pagePath}`,
      es: `${BASE_URL}/es${pagePath}`,
      "zh-Hans": `${BASE_URL}/zh-Hans${pagePath}`,
      "zh-Hant": `${BASE_URL}/zh-Hant${pagePath}`,
      "x-default": `${BASE_URL}/en${pagePath}`,
    },
  };
}

export { BASE_URL, LOCALES };
