import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { translations, mergeMessages } from "@one-colored-pixel/translations";
import enOverrides from "@/messages/en.json";
import deOverrides from "@/messages/de.json";
import jaOverrides from "@/messages/ja.json";
import koOverrides from "@/messages/ko.json";
import frOverrides from "@/messages/fr.json";
import esOverrides from "@/messages/es.json";

const overridesByLocale: Record<string, Record<string, unknown>> = {
  en: enOverrides,
  de: deOverrides,
  ja: jaOverrides,
  ko: koOverrides,
  fr: frOverrides,
  es: esOverrides,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const shared = translations[locale as keyof typeof translations];
  const overrides =
    overridesByLocale[locale] || (enOverrides as Record<string, unknown>);

  return {
    locale,
    messages: mergeMessages(shared as Record<string, unknown>, overrides),
  };
});
