export const maxDuration = 150;

import { Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import StatsSection from "@/components/StatsSection";
import FeaturesSection from "@/components/FeaturesSection";
import GalleryPreview from "@/components/GalleryPreview";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSection from "@/components/NewsletterSection";
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
      <NewsletterSection />
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
