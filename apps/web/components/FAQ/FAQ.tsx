'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import { faCircleQuestion } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/motion';

// FAQ item IDs for iteration
const FAQ_ITEM_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

type FAQProps = {
  className?: string;
};

const FAQAccordionItem = ({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <StaggerItem className="border-2 border-paper-cream-dark rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-paper-cream/30 transition-colors"
      aria-expanded={isOpen}
    >
      <span className="font-tondo font-bold text-text-primary text-base md:text-lg">
        {question}
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
          <p className="text-text-secondary leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  </StaggerItem>
);

const FAQ = ({ className }: FAQProps) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const t = useTranslations('homepage');

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  // Build FAQ items from translations
  const faqItems = FAQ_ITEM_IDS.map((id) => ({
    id,
    question: t(`faq.items.${id}.question`),
    answer: t(`faq.items.${id}.answer`),
  }));

  // JSON-LD structured data for FAQPage schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
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
      <FadeIn>
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <FontAwesomeIcon
              icon={faCircleQuestion}
              className="text-3xl md:text-4xl"
              style={iconStyle}
            />
            <h2 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
              {t('faq.title')}
            </h2>
          </div>
          <p className="text-text-secondary max-w-2xl mx-auto">
            {t('faq.subtitle')}
          </p>
        </div>
      </FadeIn>

      {/* Accordion grid - 2 columns on larger screens */}
      <StaggerChildren
        staggerDelay={0.08}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {faqItems.map((item) => (
          <FAQAccordionItem
            key={item.id}
            id={item.id}
            question={item.question}
            answer={item.answer}
            isOpen={openId === item.id}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </StaggerChildren>
    </section>
  );
};

export default FAQ;
