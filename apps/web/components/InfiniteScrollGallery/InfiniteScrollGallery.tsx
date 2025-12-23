'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadMoreImages } from '@/app/actions/load-more-images';
import type { GalleryImage } from '@/app/data/coloring-image';
import ColoringImageSkeleton from '@/components/ColoringImage/ColoringImageSkeleton';
import cn from '@/utils/cn';

type InfiniteScrollGalleryProps = {
  initialImages: GalleryImage[];
  initialCursor: string | null;
  initialHasMore: boolean;
};

// TODO: Add emoji tag filtering in the future
// - Each image has tags array that could map to emojis (e.g., 'animal' -> 🐾, 'vehicle' -> 🚗)
// - Could add a row of emoji filter buttons above the gallery
// - When tapped, filter images client-side or refetch with tag filter

const InfiniteScrollGallery = ({
  initialImages,
  initialCursor,
  initialHasMore,
}: InfiniteScrollGalleryProps) => {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Ref for the sentinel element that triggers loading
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more images when the sentinel comes into view
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);

    try {
      const result = await loadMoreImages(cursor);
      setImages((prev) => [...prev, ...result.images]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading]);

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
        {images.map((image) => (
          <Link
            href={`/coloring-image/${image.id}`}
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
                src={image.svgUrl as string}
                alt={image.description || image.title || 'Coloring page'}
                width={1024}
                height={1024}
                quality={100}
                className="w-full h-auto"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </Link>
        ))}

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
          <p className="text-sm text-text-muted">
            You&apos;ve seen all the coloring pages!
          </p>
        </div>
      )}
    </>
  );
};

export default InfiniteScrollGallery;
