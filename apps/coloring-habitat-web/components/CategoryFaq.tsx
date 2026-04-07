"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  question: string;
  answer: string;
};

type CategoryFaqProps = {
  categoryName: string;
  customFaq?: FaqItem;
  className?: string;
};

const GENERIC_FAQ: FaqItem[] = [
  {
    question: "Are these coloring pages free?",
    answer:
      "Yes, all our coloring pages are completely free to browse, color online, and download. No signup is required to start coloring.",
  },
  {
    question: "Can I print these coloring pages?",
    answer:
      "Yes, you can download any coloring page as a high-quality PDF and print it at home. The designs are optimized for standard letter and A4 paper sizes.",
  },
  {
    question: "Can I color these pages online?",
    answer:
      "Yes, our built-in coloring tools let you color any page directly in your browser. Choose from a variety of brushes, colors, and fill patterns for a relaxing digital coloring experience.",
  },
];

const CategoryFaq = ({
  categoryName,
  customFaq,
  className = "",
}: CategoryFaqProps) => {
  const faqItems = customFaq ? [...GENERIC_FAQ, customFaq] : GENERIC_FAQ;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className={`mt-16 border-t border-border pt-12 ${className}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Frequently Asked Questions about {categoryName} Coloring Pages
      </h2>
      <Accordion type="single" collapsible className="mt-6">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border-b-border/60"
          >
            <AccordionTrigger className="py-4 text-left text-base font-semibold text-foreground hover:no-underline [&[data-state=open]]:text-primary">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 leading-relaxed text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default CategoryFaq;
