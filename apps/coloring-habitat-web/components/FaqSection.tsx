"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does Coloring Habitat work?",
    answer:
      "Describe what you want to color using text, voice, or a photo. We generate a detailed, intricate coloring page in about 30 seconds. Color it online with our digital tools or download a high-res PDF to print at home.",
  },
  {
    question: "Is it really free?",
    answer:
      "You get 2 free page creations every day, no account needed. Sign up (also free) to unlock our full library of 1,000+ pages and a daily coloring page delivered to your inbox each morning.",
  },
  {
    question: "What makes this different from other coloring apps?",
    answer:
      "Coloring Habitat is designed for people seeking mindful relaxation. Every design is sophisticated and intricate, and the experience is completely ad-free and calming.",
  },
  {
    question: "Can I print the coloring pages?",
    answer:
      "Every page can be downloaded as a high-resolution PDF, perfectly sized for A4 or US Letter paper. Many users love the tactile experience of coloring with real pencils, pens, and markers.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Native iOS and Android apps are coming soon. Our web app is fully responsive and works beautifully on phones and tablets in the meantime.",
  },
];

const FaqSection = () => {
  return (
    <section className="bg-card py-24" id="faq">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Questions & answers
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b-border/60"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline [&[data-state=open]]:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
