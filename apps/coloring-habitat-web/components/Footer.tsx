import { cacheLife } from "next/cache";
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

const footerLinks = {
  Explore: [
    { label: "Gallery", href: "/gallery" },
    { label: "Create", href: "/create" },
    { label: "Categories", href: "/gallery" },
    { label: "Daily page", href: "/daily" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
  ],
  Support: [
    { label: "Contact us", href: "/contact" },
    { label: "FAQ", href: "/#faq" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
  ],
};

const socialLinks = [
  { label: "Instagram", icon: faInstagram, href: "#" },
  { label: "Facebook", icon: faFacebookF, href: "#" },
  { label: "TikTok", icon: faTiktok, href: "#" },
  { label: "Pinterest", icon: faPinterest, href: "#" },
];

const Footer = async () => {
  const year = await getCachedYear();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
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
                Coloring Habitat
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Mindful coloring for everyone. Create, color, and find your calm.
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

          {/* Link columns */}
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
            &copy; {year} Coloring Habitat. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
