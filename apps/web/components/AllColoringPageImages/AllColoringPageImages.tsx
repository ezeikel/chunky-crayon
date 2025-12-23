import { db } from '@chunky-crayon/db';
import { getColoringImagesPaginated } from '@/app/data/coloring-image';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';
import type { ColoringImageSearchParams } from '@/types';
import { AllColoringPageImagesShell } from './AllColoringPageImagesShell';

type AllColoringPageImagesProps = {
  searchParams: Promise<ColoringImageSearchParams>;
};

// Dynamic wrapper - reads user settings
const AllColoringPageImages = async ({
  searchParams,
}: AllColoringPageImagesProps) => {
  // Get user's showCommunityImages setting
  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);
  let showCommunityImages = false;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { showCommunityImages: true },
    });
    showCommunityImages = user?.showCommunityImages ?? false;
  }

  // Check URL param for filter preference
  const { show } = await searchParams;
  const effectiveShowCommunity =
    show === 'user' ? false : show === 'all' || showCommunityImages;

  // Fetch the first page of images (paginated)
  const { images, nextCursor, hasMore } = await getColoringImagesPaginated(
    userId || undefined,
    effectiveShowCommunity,
  );

  // Pass the paginated data to the shell
  return (
    <AllColoringPageImagesShell
      images={images}
      nextCursor={nextCursor}
      hasMore={hasMore}
      showCommunityImages={showCommunityImages}
    />
  );
};

export default AllColoringPageImages;
