"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/routing";
import HeaderDropdown from "@/components/HeaderDropdown";
import LanguageSwitcher from "@/components/LanguageSwitcher/LanguageSwitcher";
import cn from "@/utils/cn";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const t = useTranslations("navigation");

  const authenticatedLinks = [
    { label: t("home"), href: "/" as const },
    { label: t("gallery"), href: "/gallery" as const },
    { label: t("myArtwork"), href: "/account/my-artwork" as const },
    { label: t("pricing"), href: "/pricing" as const },
  ];

  const unauthenticatedLinks = [
    { label: t("home"), href: "/" as const },
    { label: t("gallery"), href: "/gallery" as const },
    { label: t("pricing"), href: "/pricing" as const },
    { label: t("blog"), href: "/blog" as const },
  ];

  const navLinks = isAuthenticated ? authenticatedLinks : unauthenticatedLinks;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur-sm transition-shadow duration-200",
        isScrolled && "shadow-sm border-b border-border",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          <svg
            className="h-8 w-8"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="16" cy="16" r="16" fill="#E63956" />
            <path
              d="M10 20c0-5.5 4.5-10 10-10-.8 3-2.3 5.4-4.6 7.3S11.2 20 10 20z"
              fill="white"
              opacity="0.9"
            />
            <path
              d="M14 22c0-3.8 2.8-7 6.2-7-.4 2.3-1.5 4.2-3.1 5.4-1.2 1-2.3 1.6-3.1 1.6z"
              fill="white"
              opacity="0.6"
            />
          </svg>
          <span className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
            Coloring Habitat
          </span>
        </Link>

        {/* Desktop nav + actions (right-aligned together) */}
        <div className="hidden items-center gap-6 lg:flex">
          <nav className="flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-bold text-foreground/80 transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <LanguageSwitcher variant="icon" />

          {isAuthenticated ? (
            <HeaderDropdown
              user={{
                name: session?.user?.name,
                email: session?.user?.email,
                image: session?.user?.image,
              }}
            />
          ) : (
            <Link
              href="/signin"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:shadow-md hover:scale-105 active:scale-95"
            >
              {t("signIn")}
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
        >
          <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} size="sm" />
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="border-t border-border bg-background px-6 pb-6 lg:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1 pt-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-4 border-t border-border pt-4">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-base font-semibold text-foreground"
                >
                  <FontAwesomeIcon icon={faArrowRightFromBracket} size="sm" />
                  {t("signOut")}
                </button>
              ) : (
                <Link
                  href="/signin"
                  className="block rounded-lg bg-primary px-4 py-3 text-center text-base font-bold text-primary-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("signIn")}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;
