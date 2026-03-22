"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faArrowRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { signOut } from "next-auth/react";
import HeaderDropdown from "@/components/HeaderDropdown";

const authenticatedLinks = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "My Artwork", href: "/account/my-artwork" },
  { label: "Pricing", href: "/pricing" },
];

const unauthenticatedLinks = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const navLinks = isAuthenticated ? authenticatedLinks : unauthenticatedLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
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
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Coloring Habitat
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
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
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-shadow hover:shadow-md"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
              <li key={link.label}>
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
                  Sign out
                </button>
              ) : (
                <Link
                  href="/signin"
                  className="block rounded-lg bg-primary px-4 py-3 text-center text-base font-bold text-primary-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
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
