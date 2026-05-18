import type { CSSProperties, ImgHTMLAttributes } from 'react';

type NextImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'height' | 'width'
> & {
  src:
    | string
    | {
        src: string;
      };
  alt: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  priority?: boolean;
  quality?: number | `${number}`;
  sizes?: string;
  unoptimized?: boolean;
};

const NextImage = ({
  src,
  alt,
  width,
  height,
  fill,
  style,
  priority: _priority,
  quality: _quality,
  sizes: _sizes,
  unoptimized: _unoptimized,
  ...props
}: NextImageProps) => {
  const resolvedSrc = typeof src === 'string' ? src : src.src;
  const fillStyle: CSSProperties | undefined = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }
    : undefined;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={{ ...fillStyle, ...style }}
      {...props}
    />
  );
};

export default NextImage;
