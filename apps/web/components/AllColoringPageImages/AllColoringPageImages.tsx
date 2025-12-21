import { getAllColoringImages } from '@/app/data/coloring-image';
import { showAuthButtonsFlag } from '@/flags';
import type { ColoringImageSearchParams } from '@/types';
import { AllColoringPageImagesShell } from './AllColoringPageImagesShell';

type AllColoringPageImagesProps = {
  searchParams: Promise<ColoringImageSearchParams>;
};

// Dynamic wrapper - reads the flag
const AllColoringPageImages = async ({
  searchParams,
}: AllColoringPageImagesProps) => {
  // Read the flag in the dynamic wrapper (no "use cache" here)
  const showAuthButtons = (await showAuthButtonsFlag()) as boolean;

  // Fetch the images
  const images = await getAllColoringImages(searchParams);

  // Pass both the flag value and images to the cached shell
  return (
    <AllColoringPageImagesShell
      images={images}
      showAuthButtons={showAuthButtons}
    />
  );
};

export default AllColoringPageImages;
