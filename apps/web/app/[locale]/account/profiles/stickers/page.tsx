import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import Loading from '@/components/Loading/Loading';
import { StickerBook } from '@/components/StickerBook';
import { getMyStickers } from '@/app/actions/stickers';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('stickerBook');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

// Async component that handles auth, data fetching, and translations
const StickerBookContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const [tStickerBook, tNav, stickerData] = await Promise.all([
    getTranslations('stickerBook'),
    getTranslations('navigation'),
    getMyStickers(),
  ]);

  if (!stickerData) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: tNav('home'), href: '/' },
            { label: tNav('account'), href: '/account/settings' },
            { label: tNav('stickerBook') },
          ]}
          className="mb-6"
        />
        <div className="text-center py-12">
          <p className="text-text-muted">{tStickerBook('loadError')}</p>
        </div>
      </>
    );
  }

  // Transform data for StickerBook component
  const unlockedStickers = stickerData.unlockedStickers.map((sticker) => ({
    stickerId: sticker.id,
    unlockedAt: sticker.unlockedAt,
    isNew: sticker.isNew,
  }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: tNav('home'), href: '/' },
          { label: tNav('account'), href: '/account/settings' },
          { label: tNav('stickerBook') },
        ]}
        className="mb-6"
      />
      <StickerBook unlockedStickers={unlockedStickers} />
    </>
  );
};

const StickersPage = () => {
  return (
    <PageWrap>
      <Suspense fallback={<Loading size="lg" />}>
        <StickerBookContent />
      </Suspense>
    </PageWrap>
  );
};

export default StickersPage;
