import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import Loading from '@/components/Loading/Loading';
import { StickerBook } from '@/components/StickerBook';
import { getMyStickers } from '@/app/actions/stickers';

export const metadata: Metadata = {
  title: 'Sticker Book - Chunky Crayon',
  description:
    'View your sticker collection and see what stickers you can unlock!',
};

const StickerBookContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const stickerData = await getMyStickers();

  if (!stickerData) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">
          Unable to load stickers. Please try again.
        </p>
      </div>
    );
  }

  // Transform data for StickerBook component
  const unlockedStickers = stickerData.unlockedStickers.map((sticker) => ({
    stickerId: sticker.id,
    unlockedAt: sticker.unlockedAt,
    isNew: sticker.isNew,
  }));

  return <StickerBook unlockedStickers={unlockedStickers} />;
};

const StickersPage = () => {
  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account/settings' },
          { label: 'Sticker Book' },
        ]}
        className="mb-6"
      />

      {/* Sticker Book */}
      <Suspense fallback={<Loading size="lg" />}>
        <StickerBookContent />
      </Suspense>
    </PageWrap>
  );
};

export default StickersPage;
