import HeroSection from "@/components/HeroSection";
import ShowcaseSection from "@/components/ShowcaseSection";
import StatsSection from "@/components/StatsSection";
import FeaturesSection from "@/components/FeaturesSection";
import GalleryPreview from "@/components/GalleryPreview";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSection from "@/components/NewsletterSection";
import FaqSection from "@/components/FaqSection";
import CtaSection from "@/components/CtaSection";

const HomePage = () => {
  return (
    <>
      <main>
        <HeroSection />
        <ShowcaseSection />
        <StatsSection />
        <FeaturesSection />
        <GalleryPreview />
        <TestimonialsSection />
        <NewsletterSection />
        <FaqSection />
        <CtaSection />
      </main>
    </>
  );
};

export default HomePage;
