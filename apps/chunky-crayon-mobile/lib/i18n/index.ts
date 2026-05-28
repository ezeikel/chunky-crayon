import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  translations,
  mergeMessages,
  supportedLocales,
  type SupportedLocale,
} from "@one-colored-pixel/translations";

// Mobile brand-override messages (kid tone), mirroring web's
// apps/chunky-crayon-web/messages/* pattern. These layer on top of the
// shared neutral translations from @one-colored-pixel/translations.
import enOverrides from "@/messages/en.json";
import jaOverrides from "@/messages/ja.json";
import koOverrides from "@/messages/ko.json";
import deOverrides from "@/messages/de.json";
import frOverrides from "@/messages/fr.json";
import esOverrides from "@/messages/es.json";

/**
 * Mobile i18n runtime. Same model as CC web (next-intl):
 *   resources[locale] = mergeMessages(sharedNeutral, mobileBrandOverride)
 *
 * - Shared neutral strings come from packages/translations (the same
 *   source web uses — 6 locales: en/ja/ko/de/fr/es, auto-translated by
 *   the GH Action when en.json changes).
 * - Mobile-specific brand strings live in apps/chunky-crayon-mobile/
 *   messages/* and override the shared ones.
 * - Device locale via expo-localization; fall back to en.
 *
 * Keys are namespaced (e.g. "common.save", "mobile.tabs.home"). With
 * react-i18next's default nsSeparator, we keep everything in one
 * default namespace and use dot-path keys via keySeparator ".".
 *
 * Call shape for components: useTranslation() → t("namespace.key").
 * See lib/i18n/useT.ts for a thin web-parity wrapper.
 */

const overrides: Record<SupportedLocale, Record<string, unknown>> = {
  en: enOverrides,
  ja: jaOverrides,
  ko: koOverrides,
  de: deOverrides,
  fr: frOverrides,
  es: esOverrides,
};

// Build react-i18next resources: one merged bundle per locale under the
// default "translation" namespace.
const resources = Object.fromEntries(
  supportedLocales.map((locale) => [
    locale,
    {
      translation: mergeMessages(
        translations[locale] as Record<string, unknown>,
        overrides[locale],
      ),
    },
  ]),
);

// Pick the device locale, narrowed to a supported one (else en).
function resolveDeviceLocale(): SupportedLocale {
  const device = getLocales()[0]?.languageCode ?? "en";
  return (supportedLocales as readonly string[]).includes(device)
    ? (device as SupportedLocale)
    : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLocale(),
  fallbackLng: "en",
  // Keys are dot-paths into the nested JSON ("common.save"). Disable
  // i18next's ":" namespace separator so keys with no ns still resolve
  // against the default namespace; keep "." as the key separator for
  // nested lookups.
  nsSeparator: false,
  keySeparator: ".",
  interpolation: {
    escapeValue: false, // RN has no XSS surface; t() output is plain text
  },
  returnNull: false,
});

export default i18n;
