import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faFacebookF,
  faTiktok,
  faPinterest,
} from "@fortawesome/free-brands-svg-icons";

const getCachedYear = async () => {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
};

const socialLinks = [
  { label: "Instagram", icon: faInstagram, href: "#" },
  { label: "Facebook", icon: faFacebookF, href: "#" },
  { label: "TikTok", icon: faTiktok, href: "#" },
  { label: "Pinterest", icon: faPinterest, href: "#" },
];

const Footer = async () => {
  const year = await getCachedYear();
  const t = await getTranslations("footer");

  const footerLinks = {
    [t("sections.explore")]: [
      { label: t("links.gallery"), href: "/gallery" },
      { label: t("links.create"), href: "/create" },
      { label: t("links.categories"), href: "/gallery" },
      { label: t("links.dailyPage"), href: "/daily" },
    ],
    [t("sections.company")]: [
      { label: t("links.about"), href: "/about" },
      { label: t("links.pricing"), href: "/pricing" },
      { label: t("links.blog"), href: "/blog" },
    ],
    [t("sections.support")]: [
      { label: t("links.contactUs"), href: "/contact" },
      { label: t("links.faq"), href: "/#faq" },
    ],
    [t("sections.legal")]: [
      { label: t("links.privacy"), href: "/privacy" },
      { label: t("links.terms"), href: "/terms" },
      { label: t("links.cookies"), href: "/cookies" },
    ],
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <svg
                className="h-7 w-7"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="8" fill="#C1666B" />
                <path
                  d="M8 22c0-7.2 5.8-13 13-13-1 4-3 7-6 9.5S9.5 22 8 22z"
                  fill="white"
                  opacity="0.9"
                />
                <path
                  d="M13 24c0-5 3.6-9 8-9-.5 3-2 5.5-4 7s-3 2-4 2z"
                  fill="white"
                  opacity="0.6"
                />
              </svg>
              <span className="text-base font-bold tracking-tight text-foreground">
                {t("brand")}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:text-primary"
                  aria-label={social.label}
                >
                  <FontAwesomeIcon icon={social.icon} size="lg" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/60 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("copyright", { year })}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              {t("links.privacy")}
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/terms" className="hover:text-foreground">
              {t("links.terms")}
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/cookies" className="hover:text-foreground">
              {t("links.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
