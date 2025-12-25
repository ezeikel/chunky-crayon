'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import { faCircleQuestion } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import { FAQ_ITEMS, type FAQItem } from '@/constants';

type FAQProps = {
  className?: string;
};

const FAQAccordionItem = ({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="border-2 border-paper-cream-dark rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-paper-cream/30 transition-colors"
      aria-expanded={isOpen}
    >
      <span className="font-tondo font-bold text-text-primary text-base md:text-lg">
        {item.question}
      </span>
      <FontAwesomeIcon
        icon={faChevronDown}
        className={cn(
          'w-4 h-4 text-crayon-orange flex-shrink-0 transition-transform duration-300',
          isOpen && 'rotate-180',
        )}
      />
    </button>
    <div
      className={cn(
        'grid transition-all duration-300 ease-in-out',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="overflow-hidden">
        <div className="px-5 pb-5 pt-0">
          <p className="text-text-secondary leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  </div>
);

const FAQ = ({ className }: FAQProps) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  // JSON-LD structured data for FAQPage schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section className={cn('w-full py-12 md:py-16', className)}>
      {/* FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Header */}
      <div className="text-center mb-10 md:mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="text-3xl md:text-4xl"
            style={iconStyle}
          />
          <h2 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
            Frequently Asked Questions
          </h2>
        </div>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Everything you need to know about creating magical coloring pages with
          Chunky Crayon
        </p>
      </div>

      {/* Accordion grid - 2 columns on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FAQ_ITEMS.map((item) => (
          <FAQAccordionItem
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default FAQ;
