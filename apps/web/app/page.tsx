import type { Viewport } from 'next';
import { Suspense } from 'react';
import CreateColoringPageFormWrapper from '@/components/forms/CreateColoringPageForm/CreateColoringPageFormWrapper';
import AllColoringPageImages from '@/components/AllColoringPageImages/AllColoringPageImages';
import Loading from '@/components/Loading/Loading';
import UnsubscribeToast from '@/components/UnsubscribeToast/UnsubscribeToast';
import HomePageContent from '@/components/HomePageContent';
import type { ColoringImageSearchParams } from '@/types';

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
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loading size="lg" />
          </div>
        }
      >
        <HomePageContent
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
        />
      </Suspense>
    </>
  );
};

export default HomePage;
