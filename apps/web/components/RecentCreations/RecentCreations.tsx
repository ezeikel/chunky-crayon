'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faArrowRight,
  faSparkles,
  faHeart,
} from '@fortawesome/pro-duotone-svg-icons';
import useRecentCreations from '@/hooks/useRecentCreations';
import { fetchRecentCreationImages } from '@/app/actions/recent-creations';
import type { GalleryImage } from '@/app/data/coloring-image';
import cn from '@/utils/cn';

type RecentCreationsProps = {
  className?: string;
};

const RecentCreations = ({ className }: RecentCreationsProps) => {
  const t = useTranslations('recentCreations');
  const { recentIds, isLoaded, hasCreations } = useRecentCreations();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Fetch image data when we have IDs
  useEffect(() => {
    if (!isLoaded || recentIds.length === 0) return;

    const fetchImages = async () => {
      setIsLoadingImages(true);
      try {
        const fetchedImages = await fetchRecentCreationImages(recentIds);
        setImages(fetchedImages);
      } catch (error) {
        console.error('Failed to fetch recent creation images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchImages();
  }, [isLoaded, recentIds]);

  // Don't render anything if localStorage hasn't loaded yet or no creations
  if (!isLoaded || !hasCreations) {
    return null;
  }

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-teal))',
    '--fa-secondary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const heartIconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink-light))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className={cn('w-full', className)}>
      <div className="bg-gradient-to-br from-crayon-teal/15 to-crayon-blue/15 rounded-3xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faClock}
              className="text-xl"
              style={iconStyle}
            />
            <h3 className="font-tondo font-bold text-lg md:text-xl text-text-primary">
              {t('title')}
            </h3>
          </div>
        </div>

        {/* Image Grid */}
        {isLoadingImages ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recentIds.slice(0, 6).map((id) => (
              <div
                key={id}
                className="aspect-square rounded-xl bg-white/50 animate-pulse"
              />
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {images.map((image) => (
              <Link
                key={image.id}
                href={`/coloring-image/${image.id}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300 group border-2 border-transparent hover:border-crayon-teal/30"
              >
                {image.svgUrl ? (
                  <Image
                    src={image.svgUrl}
                    alt={image.title || t('imageAlt')}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-paper-cream">
                    <FontAwesomeIcon
                      icon={faSparkles}
                      className="text-2xl text-crayon-teal/50"
                    />
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Sign up CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/80 rounded-2xl border border-crayon-teal/20">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <FontAwesomeIcon
              icon={faHeart}
              className="text-xl hidden sm:block"
              style={heartIconStyle}
            />
            <p className="font-tondo text-sm md:text-base text-text-secondary">
              <span className="font-semibold text-text-primary">
                {t('ctaHighlight')}
              </span>{' '}
              {t('ctaMessage')}
            </p>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange hover:bg-crayon-orange-dark text-white font-tondo font-bold rounded-xl shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
          >
            {t('ctaButton')}
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RecentCreations;
