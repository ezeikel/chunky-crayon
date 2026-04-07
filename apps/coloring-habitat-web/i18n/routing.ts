import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ja", "ko", "de", "fr", "es"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/gallery": "/gallery",
    "/gallery/[category]": "/gallery/[category]",
    "/gallery/daily": "/gallery/daily",
    "/gallery/difficulty/[difficulty]": "/gallery/difficulty/[difficulty]",
    "/coloring-image/[id]": "/coloring-image/[id]",
    "/blog": "/blog",
    "/gallery/holidays/[event]": "/gallery/holidays/[event]",
    "/blog/[slug]": "/blog/[slug]",
    "/pricing": "/pricing",
    "/account/settings": "/account/settings",
    "/account/billing": "/account/billing",
    "/account/billing/success": "/account/billing/success",
    "/account/my-artwork": "/account/my-artwork",
    "/signin": "/signin",
    "/shared/[code]": "/shared/[code]",
    "/privacy": "/privacy",
    "/terms": "/terms",
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing);
