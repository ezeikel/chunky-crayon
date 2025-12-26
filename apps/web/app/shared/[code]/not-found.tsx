import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faArrowRight } from '@fortawesome/pro-solid-svg-icons';
import { faFaceSadTear } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';

const SharedArtworkNotFound = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  return (
    <PageWrap className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-crayon-blue/10 to-crayon-purple/10 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faFaceSadTear}
            className="text-5xl"
            style={iconStyle}
          />
        </div>

        {/* Title */}
        <h1 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-3">
          Artwork Not Found
        </h1>

        {/* Description */}
        <p className="text-text-secondary mb-6">
          This shared artwork link may have expired or been removed. Ask the
          artist for a new link!
        </p>

        {/* Hearts decoration */}
        <div className="flex items-center justify-center gap-2 text-crayon-pink/30 mb-8">
          <FontAwesomeIcon icon={faHeart} className="text-sm" />
          <FontAwesomeIcon icon={faHeart} className="text-lg" />
          <FontAwesomeIcon icon={faHeart} className="text-sm" />
        </div>

        {/* CTA */}
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-crayon-purple to-crayon-pink text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all"
        >
          Explore Coloring Pages
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </Link>
      </div>
    </PageWrap>
  );
};

export default SharedArtworkNotFound;
