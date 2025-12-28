'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/pro-duotone-svg-icons';
import { FadeIn } from '@/components/motion';

const AnimatedGalleryHeader = () => {
  const t = useTranslations('homepage.galleryPreview');

  return (
    <FadeIn className="flex items-center justify-between mb-6">
      <h2 className="font-tondo font-bold text-2xl text-text-primary">
        {t('freeColoringPages')}
      </h2>
      <Link
        href="/gallery"
        className="text-sm font-semibold text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
      >
        {t('exploreGallery')}
        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
      </Link>
    </FadeIn>
  );
};

export default AnimatedGalleryHeader;
