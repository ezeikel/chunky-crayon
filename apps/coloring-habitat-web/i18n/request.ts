import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { translations, mergeMessages } from "@one-colored-pixel/translations";
import chOverrides from "@/messages/en.json";

// For now, only English overrides exist. Other locales will use shared translations
// until CH override translations are generated.
const overridesByLocale: Record<string, Record<string, unknown>> = {
  en: chOverrides,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const shared = translations[locale as keyof typeof translations];
  const overrides = overridesByLocale[locale] || {};

  return {
    locale,
    messages: mergeMessages(shared as Record<string, unknown>, overrides),
  };
});
