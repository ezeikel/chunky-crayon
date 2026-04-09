"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import cn from "@/utils/cn";

type FaqSectionProps = {
  /** Translation namespace for the FAQ content */
  namespace?: "homepage.faq" | "pricing.faq";
  /** Named item keys (e.g. ["cancelAnytime", "rollover"]) — use for pricing */
  itemIds?: readonly string[];
  /** Number of numbered items (e.g. 5 → fetches items.1 through items.5) — use for homepage */
  itemCount?: number;
  className?: string;
};

const FaqSection = ({
  namespace = "homepage.faq",
  itemIds,
  itemCount = 5,
  className,
}: FaqSectionProps) => {
  const t = useTranslations(namespace);

  const keys =
    itemIds ?? Array.from({ length: itemCount }, (_, i) => `${i + 1}`);

  const faqItems = keys.map((key) => ({
    id: key,
    question: t(`items.${key}.question`),
    answer: t(`items.${key}.answer`),
  }));

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
    <section className={cn("bg-card py-24", className)} id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("title")}
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border-b-border/60"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline [&[data-state=open]]:text-primary">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
