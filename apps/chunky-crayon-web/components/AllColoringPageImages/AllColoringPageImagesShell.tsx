import ImageFilterToggle from '@/components/ImageFilterToggle/ImageFilterToggle';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery';
import type { GalleryImage } from '@/app/data/coloring-image';

type AllColoringPageImagesShellProps = {
  images: GalleryImage[];
  nextCursor: string | null;
  hasMore: boolean;
  showCommunityImages: boolean;
};

export function AllColoringPageImagesShell({
  images,
  nextCursor,
  hasMore,
  showCommunityImages,
}: AllColoringPageImagesShellProps) {
  return (
    <div className="flex flex-col gap-8 p-8 w-full">
      {/* Only show filter toggle if community images is enabled in settings */}
      <div className="flex justify-end">
        <ImageFilterToggle showCommunityImages={showCommunityImages} />
      </div>
      <InfiniteScrollGallery
        initialImages={images}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
      />
    </div>
  );
}
