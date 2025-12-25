'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faArrowUp,
} from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/lib/utils';

type JumpToSection = {
  id: string;
  label: string;
  icon?: string;
};

type JumpToNavProps = {
  sections: JumpToSection[];
  className?: string;
};

const JumpToNav = ({ sections, className }: JumpToNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show back to top button after scrolling down 400px
      setShowBackToTop(window.scrollY > 400);

      // Find the current active section based on scroll position
      const scrollPosition = window.scrollY + 100; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for any fixed headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setIsOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Mobile dropdown toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3',
          'bg-white border border-paper-cream-dark rounded-xl',
          'text-sm font-medium text-text-primary',
          'hover:border-crayon-orange/30 transition-colors',
          'md:hidden',
        )}
        aria-expanded={isOpen}
        aria-controls="jump-to-menu"
      >
        <span className="flex items-center gap-2">
          <span className="text-text-tertiary">Jump to:</span>
          <span>
            {activeSection
              ? sections.find((s) => s.id === activeSection)?.label ||
                'Select section'
              : 'Select section'}
          </span>
        </span>
        <FontAwesomeIcon
          icon={isOpen ? faChevronUp : faChevronDown}
          className="text-text-tertiary text-xs"
        />
      </button>

      {/* Mobile dropdown menu */}
      {isOpen && (
        <div
          id="jump-to-menu"
          className="absolute top-full left-0 right-0 mt-2 z-50 md:hidden"
        >
          <div className="bg-white border border-paper-cream-dark rounded-xl shadow-lg overflow-hidden">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-3 text-left text-sm',
                  'border-b border-paper-cream-dark last:border-b-0',
                  'hover:bg-paper-cream transition-colors',
                  activeSection === section.id
                    ? 'text-crayon-orange font-medium bg-crayon-orange/5'
                    : 'text-text-secondary',
                )}
              >
                {section.icon && <span>{section.icon}</span>}
                {section.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop horizontal nav */}
      <nav
        className="hidden md:flex items-center gap-2 flex-wrap"
        aria-label="Jump to section"
      >
        <span className="text-sm text-text-tertiary font-medium mr-2">
          Jump to:
        </span>
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
              'border transition-all',
              activeSection === section.id
                ? 'bg-crayon-orange text-white border-crayon-orange'
                : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange/30 hover:bg-crayon-orange/5',
            )}
          >
            {section.icon && <span>{section.icon}</span>}
            {section.label}
          </button>
        ))}
      </nav>

      {/* Back to top button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 z-40',
            'w-12 h-12 rounded-full',
            'bg-crayon-orange text-white shadow-lg',
            'flex items-center justify-center',
            'hover:bg-crayon-orange-dark transition-colors',
            'animate-in fade-in slide-in-from-bottom-4 duration-300',
          )}
          aria-label="Back to top"
        >
          <FontAwesomeIcon icon={faArrowUp} className="text-lg" />
        </button>
      )}
    </div>
  );
};

export default JumpToNav;
