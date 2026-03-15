import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faArrowRight } from '@fortawesome/pro-duotone-svg-icons';
import { faStar, faHeart, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import { getSharedArtworkByCode } from '@/app/actions/share';
import PageWrap from '@/components/PageWrap/PageWrap';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import FormattedDate from './FormattedDate';
import type { SharedArtworkData } from '@/lib/share';

type SharedArtworkPageProps = {
  params: Promise<{ code: string }>;
};

// Return a placeholder param for Cache Components validation
// All real share codes are handled dynamically at runtime
export const generateStaticParams = () => [{ code: 'placeholder' }];

// Generate metadata for the shared artwork page
export async function generateMetadata({
  params,
}: SharedArtworkPageProps): Promise<Metadata> {
  await connection();
  const { code } = await params;
  const artwork = await getSharedArtworkByCode(code);

  if (!artwork) {
    return {
      title: 'Artwork Not Found - Chunky Crayon',
    };
  }

  return {
    title: `${artwork.title} by ${artwork.artistName} - Chunky Crayon`,
    description: `Check out this amazing coloring artwork by ${artwork.artistName}!`,
    openGraph: {
      title: `${artwork.title} - Chunky Crayon`,
      description: `Check out this amazing coloring artwork by ${artwork.artistName}!`,
      images: [artwork.imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artwork.title} - Chunky Crayon`,
      description: `Check out this amazing coloring artwork by ${artwork.artistName}!`,
      images: [artwork.imageUrl],
    },
  };
}

// Loading fallback component
const SharedArtworkLoading = () => (
  <PageWrap className="pb-24">
    <div className="flex items-center justify-center gap-3 mb-6">
      <FontAwesomeIcon icon={faStar} className="text-2xl text-crayon-yellow" />
      <h1 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary">
        Shared Artwork
      </h1>
      <FontAwesomeIcon icon={faStar} className="text-2xl text-crayon-yellow" />
    </div>
    <div className="flex items-center justify-center py-20">
      <FontAwesomeIcon
        icon={faSpinner}
        className="text-4xl text-crayon-purple animate-spin"
      />
    </div>
  </PageWrap>
);

// Async component that fetches the artwork data
const SharedArtworkContent = async ({ code }: { code: string }) => {
  await connection();
  const artwork = await getSharedArtworkByCode(code);

  if (!artwork) {
    notFound();
  }

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <PageWrap className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faStar}
          className="text-2xl text-crayon-yellow"
        />
        <h1 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary">
          Shared Artwork
        </h1>
        <FontAwesomeIcon
          icon={faStar}
          className="text-2xl text-crayon-yellow"
        />
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border-4 border-paper-cream-dark shadow-xl overflow-hidden">
          {/* Artwork Image */}
          <div className="relative aspect-square bg-paper-cream p-4">
            <Image
              src={artwork.imageUrl}
              alt={artwork.title}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Artwork Info */}
          <div className="p-6 border-t-4 border-paper-cream-dark bg-gradient-to-br from-crayon-purple/5 to-crayon-pink/5">
            {/* Title */}
            <h2 className="font-tondo font-bold text-xl md:text-2xl text-text-primary text-center mb-4">
              {artwork.title}
            </h2>

            {/* Artist Info */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <ProfileAvatar
                avatarId={artwork.avatarId}
                name={artwork.artistName}
                size="sm"
                showBorder
              />
              <div>
                <p className="text-sm text-text-secondary">Created by</p>
                <p className="font-tondo font-bold text-text-primary">
                  {artwork.artistName}
                </p>
              </div>
            </div>

            {/* Date */}
            <p className="text-center text-sm text-text-muted mb-4">
              <FormattedDate date={artwork.createdAt} />
            </p>

            {/* Tags */}
            {artwork.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {artwork.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-paper-cream rounded-full text-xs font-medium text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Hearts decoration */}
            <div className="flex items-center justify-center gap-2 text-crayon-pink/40">
              <FontAwesomeIcon icon={faHeart} className="text-sm" />
              <FontAwesomeIcon icon={faHeart} className="text-lg" />
              <FontAwesomeIcon icon={faHeart} className="text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-gradient-to-r from-crayon-purple to-crayon-pink rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FontAwesomeIcon
              icon={faPalette}
              className="text-2xl text-white"
              style={iconStyle}
            />
          </div>
          <h3 className="font-tondo font-bold text-lg text-white mb-2">
            Want to create your own masterpiece?
          </h3>
          <p className="text-white/80 text-sm mb-4">
            Join Chunky Crayon for free and start coloring today!
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-crayon-purple font-bold rounded-full hover:scale-105 active:scale-95 transition-transform"
          >
            Start Coloring
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-text-muted mt-8">
        Chunky Crayon - Fun coloring for kids!
      </p>
    </PageWrap>
  );
};

const SharedArtworkPage = async ({ params }: SharedArtworkPageProps) => {
  const { code } = await params;

  return (
    <Suspense fallback={<SharedArtworkLoading />}>
      <SharedArtworkContent code={code} />
    </Suspense>
  );
};

export default SharedArtworkPage;
