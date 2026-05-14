'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons';
import { loadMoreImages } from '@/app/actions/load-more-images';
import {
  loadGalleryImages,
  type GalleryType,
} from '@/app/actions/load-gallery-images';
import type { GalleryImage } from '@/app/data/coloring-image';
import ColoringImageSkeleton from '@/components/ColoringImage/ColoringImageSkeleton';
import GalleryCardDownloadButton from '@/components/GalleryCardDownloadButton/GalleryCardDownloadButton';
import { useProgressPreviews } from '@/hooks/useProgressPreviews';
import { shouldRefresh, clearRefreshSignal } from '@/utils/galleryRefresh';
import { getColoringImageUrl } from '@/lib/seo/coloring-image-url';
import cn from '@/utils/cn';

type InfiniteScrollGalleryProps = {
  initialImages: GalleryImage[];
  initialCursor: string | null;
  initialHasMore: boolean;
  galleryType?: GalleryType;
  categorySlug?: string;
  difficultySlug?: string;
  tagSlug?: string;
  comboSlug?: string;
  /**
   * Locale string used to build the canonical card URL through
   * `getColoringImageUrl`. Public images → /[locale]/coloring-pages/[slug],
   * private images → /[locale]/coloring-image/[id]. Falls back to 'en'
   * when not supplied; existing call sites that didn't pass it pre-
   * slug-migration get correct English URLs by default.
   */
  locale?: string;
};

// TODO: Add emoji tag filtering in the future
// - Each image has tags array that could map to emojis (e.g., 'animal' -> 🐾, 'vehicle' -> 🚗)
// - Could add a row of emoji filter buttons above the gallery
// - When tapped, filter images client-side or refetch with tag filter

const InfiniteScrollGallery = ({
  initialImages,
  initialCursor,
  initialHasMore,
  galleryType,
  categorySlug,
  difficultySlug,
  tagSlug,
  comboSlug,
  locale = 'en',
}: InfiniteScrollGalleryProps) => {
  const t = useTranslations('gallery.infiniteScroll');
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Track when component mounted to detect stale data
  const mountedAtRef = useRef(Date.now());

  // Ref for the sentinel element that triggers loading
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Check if we need to refresh after navigation (e.g., after creating an image)
  useEffect(() => {
    if (shouldRefresh(mountedAtRef.current)) {
      clearRefreshSignal();
      router.refresh();
    }
  }, [router]);

  // Fetch progress previews for displayed images
  const imageIds = useMemo(() => images.map((img) => img.id), [images]);
  const { getPreview } = useProgressPreviews(imageIds);

  // Load more images when the sentinel comes into view
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);

    try {
      // Use gallery-specific loader if galleryType is provided
      const result = galleryType
        ? await loadGalleryImages(
            galleryType,
            cursor,
            categorySlug,
            difficultySlug,
            tagSlug,
            comboSlug,
          )
        : await loadMoreImages(cursor);
      setImages((prev) => [...prev, ...result.images]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    cursor,
    hasMore,
    isLoading,
    galleryType,
    categorySlug,
    difficultySlug,
    tagSlug,
    comboSlug,
  ]);

  // Set up Intersection Observer
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When sentinel is visible and we have more to load
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        // Trigger when sentinel is 200px from viewport
        rootMargin: '200px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, loadMore]);

  // Show empty state if no images
  if (images.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-text-secondary">No coloring pages yet!</p>
        <p className="text-sm text-text-muted mt-2">
          Create your first coloring page above.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Image grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => {
          // Use progress preview if available, otherwise fall back to SVG
          const previewUrl = getPreview(image.id);
          const imageSrc = previewUrl || (image.svgUrl as string);

          return (
            <Link
              href={getColoringImageUrl(image, locale)}
              key={image.id}
              className="block"
            >
              <div
                className={cn(
                  'relative w-full overflow-hidden rounded-lg shadow-lg bg-white',
                  'transition-transform duration-200 hover:scale-[1.02]',
                )}
              >
                <Image
                  src={imageSrc}
                  alt={image.description || image.title || 'Coloring page'}
                  width={1024}
                  height={1024}
                  quality={100}
                  className="w-full h-auto"
                  style={{ objectFit: 'cover' }}
                />
                {/* Always-visible PDF download for this single page. Stops
                    propagation so tapping it triggers the download instead
                    of navigating to the detail view. Public images only —
                    private/in-flight rows wouldn't match the API filter so
                    skip rendering the button on those. */}
                {image.userId === null &&
                  image.showInCommunity &&
                  image.status === 'READY' && (
                    <GalleryCardDownloadButton coloringImageId={image.id} />
                  )}
                {/* Show palette indicator when there's progress (kid-friendly, no text) */}
                {previewUrl && (
                  <div className="absolute bottom-2 right-2 size-8 bg-crayon-orange rounded-full shadow-lg flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faPalette}
                      className="text-sm text-white"
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {/* Show skeleton loaders while loading more */}
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <ColoringImageSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {/* Sentinel element for Intersection Observer */}
      {hasMore && (
        <div ref={loadMoreRef} className="h-4 w-full" aria-hidden="true" />
      )}

      {/* End of list indicator */}
      {!hasMore && images.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-text-muted">{t('allPagesViewed')}</p>
        </div>
      )}
    </>
  );
};

export default InfiniteScrollGallery;
