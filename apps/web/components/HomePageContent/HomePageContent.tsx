'use client';

import { useSession } from 'next-auth/react';
import PageWrap from '@/components/PageWrap/PageWrap';
import Intro from '@/components/Intro/Intro';
import Loading from '@/components/Loading/Loading';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import DashboardHeader from './DashboardHeader';

type HomePageContentProps = {
  /** Form for logged-out users (default size) */
  form: React.ReactNode;
  /** Form for logged-in users (large size) - optional, falls back to form */
  formLarge?: React.ReactNode;
  /** Gallery component */
  gallery: React.ReactNode;
};

const HomePageContent = ({
  form,
  formLarge,
  gallery,
}: HomePageContentProps) => {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const isLoading = status === 'loading';

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <PageWrap className="bg-paper flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" />
      </PageWrap>
    );
  }

  // Logged-in experience: centered form, no marketing, kid-focused
  if (isLoggedIn) {
    return (
      <PageWrap className="bg-paper flex flex-col items-center gap-y-12 md:gap-y-16 relative overflow-hidden">
        {/* Decorative background shapes - more subtle for logged-in experience */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-[15%] w-24 h-24 md:w-32 md:h-32 bg-crayon-pink-light/15 rounded-full blur-3xl" />
          <div className="absolute top-[30%] right-[10%] w-32 h-32 md:w-40 md:h-40 bg-crayon-teal-light/15 rounded-full blur-3xl" />
          <div className="absolute bottom-[25%] left-[25%] w-28 h-28 md:w-36 md:h-36 bg-crayon-yellow-light/20 rounded-full blur-3xl" />
        </div>

        {/* Hero section - centered and focused */}
        <div className="flex flex-col items-center w-full max-w-2xl relative z-10">
          {/* Simple, playful greeting with sparkles */}
          <DashboardHeader />

          {/* Centered, larger form */}
          <div className="w-full">{formLarge || form}</div>
        </div>

        {/* Gallery section */}
        {gallery}
      </PageWrap>
    );
  }

  // Logged-out experience: marketing layout with Intro + form side-by-side
  return (
    <PageWrap className="bg-paper flex items-center gap-y-16 md:gap-y-20 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-32 h-32 md:w-48 md:h-48 bg-crayon-pink-light/20 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[5%] w-40 h-40 md:w-56 md:h-56 bg-crayon-teal-light/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[20%] w-36 h-36 md:w-52 md:h-52 bg-crayon-yellow-light/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[5%] right-[15%] w-28 h-28 md:w-40 md:h-40 bg-crayon-purple-light/15 rounded-full blur-3xl" />
      </div>

      {/* Hero section */}
      <div className="flex flex-col lg:flex-row gap-10 md:gap-12 lg:gap-16 w-full items-center lg:items-start lg:justify-between relative z-10">
        <Intro className="flex-1 max-w-xl lg:max-w-none lg:flex-shrink" />
        <div className="flex-shrink-0 w-full max-w-lg">{form}</div>
      </div>

      {/* Testimonials section - social proof for logged-out users */}
      <Testimonials className="relative z-10" />

      {/* FAQ section */}
      <FAQ className="relative z-10" />

      {/* Gallery section */}
      {gallery}
    </PageWrap>
  );
};

export default HomePageContent;
