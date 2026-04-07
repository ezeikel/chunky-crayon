"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_COUNT = 5;

const FaqSection = () => {
  const t = useTranslations("homepage.faq");

  const faqItems = Array.from({ length: FAQ_COUNT }).map((_, index) => ({
    question: t(`items.${index + 1}.question`),
    answer: t(`items.${index + 1}.answer`),
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
    <section className="bg-card py-24" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("title")}
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
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
