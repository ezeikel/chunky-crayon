import type { Viewport } from 'next';
import { Suspense } from 'react';
import CreateColoringPageFormWrapper from '@/components/forms/CreateColoringPageForm/CreateColoringPageFormWrapper';
import AllColoringPageImages from '@/components/AllColoringPageImages/AllColoringPageImages';
import GalleryPreview from '@/components/GalleryPreview';
import SocialProofStats from '@/components/SocialProofStats';
import RecentCreations from '@/components/RecentCreations';
import Loading from '@/components/Loading/Loading';
import UnsubscribeToast from '@/components/UnsubscribeToast/UnsubscribeToast';
import HomePageContent from '@/components/HomePageContent';
import Intro from '@/components/Intro/Intro';
import { getMyColoState } from '@/app/actions/colo';
import { getActiveProfile } from '@/app/actions/profiles';
import type { ColoringImageSearchParams } from '@/types';
import type { ColoState } from '@/lib/colo';

export const maxDuration = 150;

// FIX: stop 14px fonts for inputs from zooming in on focus on iOS
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

type HomePageProps = {
  searchParams: Promise<ColoringImageSearchParams>;
};

// Async component to fetch Colo state inside Suspense boundary
const ColoStateLoader = async (): Promise<ColoState | null> => {
  const activeProfile = await getActiveProfile();
  return activeProfile ? await getMyColoState() : null;
};

// Wrapper component that passes coloState to HomePageContent
const HomePageWithColoState = async ({
  searchParams,
  form,
  formLarge,
  gallery,
  galleryPreview,
  socialProofStats,
  recentCreations,
  intro,
}: {
  searchParams: Promise<ColoringImageSearchParams>;
  form: React.ReactNode;
  formLarge: React.ReactNode;
  gallery: React.ReactNode;
  galleryPreview: React.ReactNode;
  socialProofStats: React.ReactNode;
  recentCreations: React.ReactNode;
  intro: React.ReactNode;
}) => {
  const coloState = await ColoStateLoader();

  return (
    <HomePageContent
      coloState={coloState}
      form={form}
      formLarge={formLarge}
      gallery={gallery}
      galleryPreview={galleryPreview}
      socialProofStats={socialProofStats}
      recentCreations={recentCreations}
      intro={intro}
    />
  );
};

// Main page - static shell with client-side auth-aware layout
// Uses PPR: static page with dynamic pockets in Suspense boundaries
const HomePage = async ({ searchParams }: HomePageProps) => {
  return (
    <>
      {/* Toast handler for unsubscribe */}
      <Suspense fallback={null}>
        <UnsubscribeToast />
      </Suspense>

      {/* Client component handles auth-based layout switching */}
      {/* Form and gallery are server-rendered and passed as slots */}
      {/* Wrapped in Suspense so coloState fetching doesn't block static generation */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" />
          </div>
        }
      >
        <HomePageWithColoState
          searchParams={searchParams}
          form={
            <Suspense
              fallback={
                <div className="w-full flex flex-col gap-y-4 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark min-h-[350px] items-center justify-center">
                  <Loading size="lg" />
                </div>
              }
            >
              <CreateColoringPageFormWrapper />
            </Suspense>
          }
          formLarge={
            <Suspense
              fallback={
                <div className="w-full flex flex-col gap-y-4 p-6 md:p-8 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark min-h-[350px] items-center justify-center">
                  <Loading size="lg" />
                </div>
              }
            >
              <CreateColoringPageFormWrapper size="large" />
            </Suspense>
          }
          gallery={
            <Suspense
              fallback={
                <div className="flex flex-col gap-8 p-8 min-h-[400px] items-center justify-center w-full">
                  <Loading size="lg" />
                </div>
              }
            >
              <AllColoringPageImages searchParams={searchParams} />
            </Suspense>
          }
          galleryPreview={
            <Suspense
              fallback={
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 bg-paper-cream rounded-3xl animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <GalleryPreview />
            </Suspense>
          }
          socialProofStats={
            <Suspense
              fallback={
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-paper-cream rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <SocialProofStats />
            </Suspense>
          }
          recentCreations={<RecentCreations />}
          intro={<Intro />}
        />
      </Suspense>
    </>
  );
};

export default HomePage;
