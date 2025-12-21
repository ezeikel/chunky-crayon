'use cache';

import Link from 'next/link';
import { cacheLife, cacheTag } from 'next/cache';
import ColoringImage from '@/components/ColoringImage/ColoringImage';
import ImageFilterToggle from '@/components/ImageFilterToggle/ImageFilterToggle';

type AllColoringPageImagesShellProps = {
  images: Array<{
    id: string;
    title: string;
    description: string;
    svgUrl: string | null;
    userId: string | null;
  }>;
  showAuthButtons: boolean;
};

export async function AllColoringPageImagesShell({
  images,
  showAuthButtons,
}: AllColoringPageImagesShellProps) {
  // Configure caching
  cacheLife('hours');
  cacheTag('coloring-images');

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Pass the flag value to the client component */}
      <div className="flex justify-end">
        <ImageFilterToggle showAuthButtons={showAuthButtons} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((coloringImage) => (
          <Link
            href={`/coloring-image/${coloringImage.id}`}
            key={coloringImage.id}
          >
            <ColoringImage
              id={coloringImage.id}
              className="rounded-lg shadow-lg bg-white"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
