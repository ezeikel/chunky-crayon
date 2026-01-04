'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type GalleryImageWithPreviewProps = {
  /** Coloring image ID */
  imageId: string;
  /** Default image URL (SVG) to show if no preview */
  defaultSrc: string;
  /** Alt text for the image */
  alt: string;
  /** Additional class names */
  className?: string;
  /** Whether to fill the container */
  fill?: boolean;
  /** Width (when not using fill) */
  width?: number;
  /** Height (when not using fill) */
  height?: number;
  /** Image quality */
  quality?: number;
  /** Object fit style */
  objectFit?: 'contain' | 'cover';
  /** Show "In Progress" badge when there's a preview */
  showBadge?: boolean;
  /** Badge position */
  badgePosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
};

// Simple cache for preview URLs to avoid repeated fetches
const previewCache = new Map<string, string | null>();

/**
 * Image component that automatically shows progress preview if available.
 * Falls back to the default SVG if user has no progress.
 */
const GalleryImageWithPreview = ({
  imageId,
  defaultSrc,
  alt,
  className,
  fill = false,
  width = 1024,
  height = 1024,
  quality = 100,
  objectFit = 'contain',
  showBadge = true,
  badgePosition = 'bottom-right',
}: GalleryImageWithPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null | undefined>(
    previewCache.get(imageId),
  );

  useEffect(() => {
    // Skip if already cached
    if (previewCache.has(imageId)) {
      setPreviewUrl(previewCache.get(imageId));
      return;
    }

    // Fetch preview for this image
    const fetchPreview = async () => {
      try {
        const response = await fetch(
          `/api/canvas/previews?imageIds=${imageId}`,
        );
        if (response.ok) {
          const data = await response.json();
          const preview = data.previews?.find(
            (p: { coloringImageId: string }) => p.coloringImageId === imageId,
          );
          const url = preview?.previewUrl || null;
          previewCache.set(imageId, url);
          setPreviewUrl(url);
        } else {
          previewCache.set(imageId, null);
          setPreviewUrl(null);
        }
      } catch {
        previewCache.set(imageId, null);
        setPreviewUrl(null);
      }
    };

    fetchPreview();
  }, [imageId]);

  const imageSrc = previewUrl || defaultSrc;
  const hasProgress = Boolean(previewUrl);

  const badgePositionClasses = {
    'top-right': 'top-2 right-2',
    'bottom-right': 'bottom-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-left': 'bottom-2 left-2',
  };

  return (
    <>
      <Image
        src={imageSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        quality={quality}
        className={cn(className)}
        style={{ objectFit }}
      />
      {/* Show palette indicator when there's progress (kid-friendly, no text) */}
      {showBadge && hasProgress && (
        <div
          className={cn(
            'absolute size-7 bg-crayon-orange rounded-full shadow-lg flex items-center justify-center z-10',
            badgePositionClasses[badgePosition],
          )}
        >
          <FontAwesomeIcon icon={faPalette} className="text-xs text-white" />
        </div>
      )}
    </>
  );
};

export default GalleryImageWithPreview;
