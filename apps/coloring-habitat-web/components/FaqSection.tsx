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

  return (
    <section className="bg-card py-24" id="faq">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("title")}
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {Array.from({ length: FAQ_COUNT }).map((_, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b-border/60"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline [&[data-state=open]]:text-primary">
                {t(`items.${index + 1}.question`)}
              </AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                {t(`items.${index + 1}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
