import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faHeart,
  faArrowRight,
} from '@fortawesome/pro-duotone-svg-icons';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import Loading from '@/components/Loading/Loading';
import { getUserSavedArtwork } from '@/app/actions/saved-artwork';
import DeleteArtworkButton from './DeleteArtworkButton';

export const metadata: Metadata = {
  title: 'My Artwork - Chunky Crayon',
  description: 'View and manage your saved coloring artwork.',
};

const ArtworkGrid = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const savedArtwork = await getUserSavedArtwork();

  if (savedArtwork.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-crayon-pink/10 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-4xl text-crayon-pink"
          />
        </div>
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-2">
          No saved artwork yet!
        </h2>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Start coloring and save your creations to see them here. Your artwork
          will be saved forever!
        </p>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
        >
          Browse Coloring Pages
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
      {savedArtwork.map((artwork) => (
        <div
          key={artwork.id}
          className="group relative bg-white rounded-2xl border-2 border-paper-cream-dark overflow-hidden hover:border-crayon-pink/50 hover:shadow-lg transition-all"
        >
          {/* Artwork Image */}
          <Link
            href={`/coloring-image/${artwork.coloringImageId}`}
            className="block aspect-square relative"
          >
            <Image
              src={artwork.imageUrl}
              alt={artwork.title || 'Saved artwork'}
              fill
              className="object-contain p-2"
            />
          </Link>

          {/* Title and Actions */}
          <div className="p-3 border-t border-paper-cream-dark">
            <h3 className="font-tondo font-semibold text-sm text-text-primary truncate mb-2">
              {artwork.title}
            </h3>
            <div className="flex items-center justify-between">
              <Link
                href={`/coloring-image/${artwork.coloringImageId}`}
                className="text-xs text-crayon-teal hover:text-crayon-teal-dark transition-colors"
              >
                Color again
              </Link>
              <DeleteArtworkButton artworkId={artwork.id} />
            </div>
          </div>

          {/* Date Badge */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 rounded-full text-xs text-text-tertiary shadow-sm">
            {new Date(artwork.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const MyArtworkPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account/settings' },
          { label: 'My Artwork' },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faHeart}
            className="text-3xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            My Artwork
          </h1>
        </div>
        <p className="text-text-secondary max-w-lg mx-auto">
          All your saved coloring creations in one place. Click on any artwork
          to color it again or make a new version!
        </p>
      </div>

      {/* Artwork Grid */}
      <Suspense fallback={<Loading size="lg" />}>
        <ArtworkGrid />
      </Suspense>
    </PageWrap>
  );
};

export default MyArtworkPage;
