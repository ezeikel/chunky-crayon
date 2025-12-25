'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/pro-duotone-svg-icons';
import { FadeIn } from '@/components/motion';

const AnimatedGalleryHeader = () => {
  return (
    <FadeIn className="flex items-center justify-between mb-6">
      <h2 className="font-tondo font-bold text-2xl text-text-primary">
        Free Coloring Pages
      </h2>
      <Link
        href="/gallery"
        className="text-sm font-semibold text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
      >
        Explore Gallery
        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
      </Link>
    </FadeIn>
  );
};

export default AnimatedGalleryHeader;
