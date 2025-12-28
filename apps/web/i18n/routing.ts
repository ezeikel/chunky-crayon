import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ja", "ko", "de", "fr", "es"],
  defaultLocale: "en",
  pathnames: {
    // Home
    "/": "/",

    // Gallery
    "/gallery": "/gallery",
    "/gallery/[category]": "/gallery/[category]",
    "/gallery/community": "/gallery/community",
    "/gallery/daily": "/gallery/daily",
    "/gallery/for-toddlers": "/gallery/for-toddlers",
    "/gallery/for-kids": "/gallery/for-kids",
    "/gallery/for-teens": "/gallery/for-teens",
    "/gallery/for-adults": "/gallery/for-adults",
    "/gallery/difficulty/[difficulty]": "/gallery/difficulty/[difficulty]",

    // Coloring
    "/coloring-image/[id]": "/coloring-image/[id]",

    // Blog
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/blog/category/[slug]": "/blog/category/[slug]",

    // Pricing
    "/pricing": "/pricing",

    // Account
    "/account/settings": "/account/settings",
    "/account/billing": "/account/billing",
    "/account/billing/success": "/account/billing/success",
    "/account/my-artwork": "/account/my-artwork",
    "/account/challenges": "/account/challenges",
    "/account/profiles": "/account/profiles",
    "/account/profiles/[id]": "/account/profiles/[id]",
    "/account/profiles/stickers": "/account/profiles/stickers",

    // Auth
    "/signin": "/signin",

    // Sharing
    "/shared/[code]": "/shared/[code]",

    // Legal
    "/privacy": "/privacy",
    "/terms": "/terms",

    // Other
    "/unsubscribe": "/unsubscribe",
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing);
