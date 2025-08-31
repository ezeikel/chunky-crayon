import Image from 'next/image';
import { getColoringImage } from '@/app/actions';
import cn from '@/utils/cn';

type ColoringImageProps = {
  id: string;
  className?: string;
};

const ColoringImage = async ({ id, className }: ColoringImageProps) => {
  const coloringImage = await getColoringImage(id);

  if (!coloringImage) {
    return null;
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden', {
        [className as string]: !!className,
      })}
    >
      <Image
        src={coloringImage.svgUrl as string}
        alt={coloringImage.alt as string}
        width={1024}
        height={1024}
        quality={100}
        style={{
          objectFit: 'cover',
        }}
      />
    </div>
  );
};

export default ColoringImage;
