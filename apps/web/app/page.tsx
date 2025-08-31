import type { Viewport } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';
import CreateColoringPageForm from '@/components/forms/CreateColoringPageForm/CreateColoringPageForm';
import AllColoringPageImages from '@/components/AllColoringPageImages/AllColoringPageImages';
import Intro from '@/components/Intro/Intro';
import { showAuthButtonsFlag } from '@/flags';
import { getAllColoringImages } from '@/app/actions';

export const maxDuration = 150;

// FIX: stop 14px fonts for inputs from zooming in on focus on iOS
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const HomePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ show: string }>;
}) => {
  const { show } = await searchParams;
  const showAuthButtons = (await showAuthButtonsFlag()) as boolean;
  const images = await getAllColoringImages(show);

  return (
    <PageWrap className='bg-gradient-to-br from-[#FFF2E6] to-[#FFE6CC]" items-center gap-y-16'>
      <div className="flex flex-col md:flex-row gap-16 w-full items-center md:items-start md:justify-start">
        <Intro className="flex-grow-1 flex-shrink-1 basis-1 md:basis-1/2" />
        <CreateColoringPageForm
          className="flex-grow-1 flex-shrink-0 basis-1 md:basis-1/2"
          showAuthButtons={showAuthButtons}
        />
      </div>
      <AllColoringPageImages images={images} />
    </PageWrap>
  );
};

export default HomePage;
