'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/pro-duotone-svg-icons';
import { signOutAction } from '@/app/actions/auth';
import cn from '@/lib/utils';
import { ParentalGateLink } from '@/components/ParentalGate';
import type { MobileNavItem } from './Header';

type MobileMenuProps = {
  items: MobileNavItem[];
};

const MobileMenu = ({ items }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only render portal after component mounts (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  const renderMenuItem = (item: MobileNavItem) => {
    const iconStyle = {
      '--fa-primary-color': 'hsl(var(--crayon-orange))',
      '--fa-secondary-color': 'hsl(var(--crayon-teal))',
      '--fa-secondary-opacity': '0.8',
    } as React.CSSProperties;

    if (item.action === 'signout') {
      return (
        <button
          type="button"
          className="flex items-center gap-3 p-3 w-full text-left font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          onClick={async () => {
            setIsOpen(false);
            await signOutAction();
          }}
        >
          {item.iconName && (
            <FontAwesomeIcon
              icon={item.iconName}
              className="text-xl"
              style={iconStyle}
            />
          )}
          {item.label}
        </button>
      );
    }

    if (item.href) {
      // Items that require parental gate (Billing, Settings, Support)
      // Check this first so mailto: links with parental gate are handled
      if (item.requiresParentalGate) {
        return (
          <ParentalGateLink
            href={item.href}
            className="flex items-center gap-3 p-3 w-full text-left font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          >
            {item.iconName && (
              <FontAwesomeIcon
                icon={item.iconName}
                className="text-xl"
                style={iconStyle}
              />
            )}
            {item.label}
          </ParentalGateLink>
        );
      }

      // External links (mailto:, etc.) without parental gate
      if (item.href.startsWith('mailto:')) {
        return (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
            onClick={() => setIsOpen(false)}
          >
            {item.iconName && (
              <FontAwesomeIcon
                icon={item.iconName}
                className="text-xl"
                style={iconStyle}
              />
            )}
            {item.label}
          </a>
        );
      }

      return (
        <Link
          href={item.href}
          className="flex items-center gap-3 p-3 font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          onClick={() => setIsOpen(false)}
        >
          {item.iconName && (
            <FontAwesomeIcon
              icon={item.iconName}
              className="text-xl"
              style={iconStyle}
            />
          )}
          {item.label}
        </Link>
      );
    }

    // Coins/credits display - special styling
    const coinsStyle = {
      '--fa-primary-color': 'hsl(var(--crayon-yellow-dark))',
      '--fa-secondary-color': 'hsl(var(--crayon-orange))',
      '--fa-secondary-opacity': '1',
    } as React.CSSProperties;

    return (
      <div className="flex items-center gap-3 p-3 font-tondo font-bold text-text-primary">
        {item.iconName && (
          <FontAwesomeIcon
            icon={item.iconName}
            className="text-xl"
            style={item.label.includes('credits') ? coinsStyle : iconStyle}
          />
        )}
        {item.label}
      </div>
    );
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2.5 hover:bg-paper-cream rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Open menu"
      >
        <FontAwesomeIcon
          icon={faBars}
          className="text-2xl"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.8',
            } as React.CSSProperties
          }
        />
      </button>

      {/* Overlay and Panel - rendered via portal to escape header stacking context */}
      {mounted &&
        isOpen &&
        createPortal(
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-[100] animate-fade-in"
              onClick={() => setIsOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
            />
            {/* Slide-out panel */}
            <div
              className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-crayon-xl rounded-l-2xl z-[100] animate-slide-in-right flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-paper-cream-dark">
                <h2 className="font-tondo font-bold text-xl text-text-primary">
                  Menu
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-paper-cream rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Close menu"
                >
                  <FontAwesomeIcon
                    icon={faXmark}
                    className="text-2xl"
                    style={
                      {
                        '--fa-primary-color': 'hsl(var(--crayon-orange))',
                        '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                        '--fa-secondary-opacity': '0.8',
                      } as React.CSSProperties
                    }
                  />
                </button>
              </div>

              {/* Navigation items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.href || item.label}
                      className={cn(item.liClass)}
                    >
                      {renderMenuItem(item)}
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Fun decoration at bottom */}
              <div className="p-4 flex justify-center gap-2 opacity-50">
                <span
                  className="text-2xl animate-float"
                  style={{ animationDelay: '0s' }}
                >
                  🖍️
                </span>
                <span
                  className="text-2xl animate-float"
                  style={{ animationDelay: '0.2s' }}
                >
                  🎨
                </span>
                <span
                  className="text-2xl animate-float"
                  style={{ animationDelay: '0.4s' }}
                >
                  ✨
                </span>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default MobileMenu;
