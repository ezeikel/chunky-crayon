import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { translations } from "@chunky-crayon/translations";

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the requestLocale (required in next-intl v4)
  const requested = await requestLocale;

  // Validate that the incoming locale is valid
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: translations[locale as keyof typeof translations],
  };
});
