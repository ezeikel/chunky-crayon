export const maxDuration = 150;

import type { Metadata } from "next";
import { Suspense } from "react";
import { generateAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Coloring Habitat | Mindful Coloring for Adults",
    description:
      "Create beautiful coloring pages for relaxation and mindfulness. Type, talk, or snap a photo to generate intricate designs.",
    alternates: generateAlternates(locale, ""),
  };
}
import HeroSection from "@/components/HeroSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import StatsSection from "@/components/StatsSection";
import FeaturesSection from "@/components/FeaturesSection";
import GalleryPreview from "@/components/GalleryPreview";
import TestimonialsSection from "@/components/TestimonialsSection";
import FaqSection from "@/components/FaqSection";
import CtaSection from "@/components/CtaSection";

const HomePageContent = async () => {
  return (
    <>
      <HeroSection />
      <ShowcaseSection />
      <StatsSection />
      <FeaturesSection />
      <GalleryPreview />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
};

const HomePage = () => {
  return (
    <main>
      <Suspense>
        <HomePageContent />
      </Suspense>
    </main>
  );
};

export default HomePage;
