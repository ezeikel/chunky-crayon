import type { Viewport } from 'next';
import { Suspense } from 'react';
import PageWrap from '@/components/PageWrap/PageWrap';
import CreateColoringPageFormWrapper from '@/components/forms/CreateColoringPageForm/CreateColoringPageFormWrapper';
import AllColoringPageImages from '@/components/AllColoringPageImages/AllColoringPageImages';
import Intro from '@/components/Intro/Intro';
import Loading from '@/components/Loading/Loading';
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

// Main page - now with pre-rendered shell and dynamic pockets
const HomePage = async ({ searchParams }: HomePageProps) => {
  return (
    <PageWrap className="bg-gradient-to-br from-[#FFF2E6] to-[#FFE6CC] flex items-center gap-y-16">
      <div className="flex flex-col md:flex-row gap-16 w-full items-center md:items-start md:justify-start">
        <Intro className="flex-grow-1 flex-shrink-1 basis-1 md:basis-1/2" />
        <Suspense
          fallback={
            <div className="max-w-lg flex flex-col gap-y-4 p-8 bg-white rounded-lg shadow-perfect min-h-[300px] flex-grow-1 flex-shrink-0 basis-1 md:basis-1/2">
              <Loading size="lg" />
            </div>
          }
        >
          <CreateColoringPageFormWrapper className="flex-grow-1 flex-shrink-0 basis-1 md:basis-1/2" />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-8 p-8 min-h-[400px]">
            <Loading size="lg" />
          </div>
        }
      >
        <AllColoringPageImages searchParams={searchParams} />
      </Suspense>
    </PageWrap>
  );
};

export default HomePage;
