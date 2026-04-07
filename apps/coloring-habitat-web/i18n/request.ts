import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { translations, mergeMessages } from "@one-colored-pixel/translations";
import enOverrides from "@/messages/en.json";

// For now, only English overrides exist. Other locales will use shared translations
// with English overrides as fallback until CH override translations are generated.
const overridesByLocale: Record<string, Record<string, unknown>> = {
  en: enOverrides,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const shared = translations[locale as keyof typeof translations];

  // Always start with English overrides as fallback, then layer locale-specific on top
  const localeOverrides = overridesByLocale[locale] || {};
  const fallbackOverrides = enOverrides as Record<string, unknown>;
  const overrides =
    locale === "en"
      ? fallbackOverrides
      : mergeMessages(fallbackOverrides, localeOverrides);

  return {
    locale,
    messages: mergeMessages(shared as Record<string, unknown>, overrides),
  };
});
