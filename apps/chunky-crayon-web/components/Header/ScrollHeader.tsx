'use client';

import { useState, useEffect, ReactNode } from 'react';
import cn from '@/utils/cn';

type ScrollHeaderProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Client wrapper that adds scroll-based shadow to the header.
 * Shadow only appears after user scrolls past threshold.
 */
const ScrollHeader = ({ children, className }: ScrollHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show shadow after scrolling 10px
      setIsScrolled(window.scrollY > 10);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-50',
        'bg-white/95 backdrop-blur-sm',
        'transition-shadow duration-200',
        isScrolled &&
          'shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-paper-cream-dark/50',
        className,
      )}
    >
      {children}
    </header>
  );
};

export default ScrollHeader;
