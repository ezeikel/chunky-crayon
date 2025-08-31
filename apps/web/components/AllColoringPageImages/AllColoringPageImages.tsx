import Link from 'next/link';
import { getAllColoringImages } from '@/app/actions';
import ColoringImage from '@/components/ColoringImage/ColoringImage';
import ImageFilterToggle from '@/components/ImageFilterToggle/ImageFilterToggle';
import { showAuthButtonsFlag } from '@/flags';

type AllColoringPageImagesProps = {
  images: Awaited<ReturnType<typeof getAllColoringImages>>;
};

const AllColoringPageImages = async ({
  images,
}: AllColoringPageImagesProps) => {
  const showAuthButtons = await showAuthButtonsFlag();

  return (
    <div className="flex flex-col gap-8 p-8">
      {showAuthButtons && (
        <div className="flex justify-end">
          <ImageFilterToggle />
        </div>
      )}
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
};

export default AllColoringPageImages;
