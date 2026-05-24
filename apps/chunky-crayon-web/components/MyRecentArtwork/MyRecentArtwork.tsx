import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getUserSavedArtwork } from '@/app/actions/saved-artwork';
import MyRecentArtworkView from './MyRecentArtworkView';

/**
 * Logged-in homepage's recent-artwork strip.
 *
 * Replaced the previous wall-of-images (AllColoringPageImages, which
 * mixed user art with community UGC). The kid-finds-their-bunny case
 * is solved by showing the latest ~10 of their own saved artwork up
 * front; the long-tail browse moves to /account/my-stuff via the
 * "See all my pictures" door.
 *
 * Three brand rules baked in:
 *   1. Logged-in surfaces never show community UGC — CC is for 3-8yo
 *      and we can't policy what other users created. See
 *      `feedback_cc_no_community_for_logged_in`.
 *   2. Filtered by active profile (getUserSavedArtwork already does
 *      this) — each kid sees their own pile.
 *   3. Horizontal scroll on mobile, grid on desktop. No infinite
 *      scroll: 3-8yo finding things benefits from a bounded set + a
 *      door to the rest, not endless scrolling.
 *
 * Server-rendered. The presentation half (MyRecentArtworkView) lives
 * in its own file so Storybook can import it without dragging the
 * `@/auth` chain. Same pattern as GalleryStats.
 */

const MyRecentArtwork = async () => {
  const session = await auth();
  if (!session?.user) return null;

  const [savedArtwork, t] = await Promise.all([
    getUserSavedArtwork(),
    getTranslations('myRecentArtwork'),
  ]);

  return (
    <MyRecentArtworkView
      // Top 10 — anything older is one tap away on /account/my-stuff.
      // 10 fills a 2x5 grid on desktop / 5 across two rows on tablet /
      // a comfortable horizontal scroll on mobile.
      items={savedArtwork.slice(0, 10).map((sa) => ({
        id: sa.id,
        imageUrl: sa.imageUrl,
        artworkId: sa.coloringImageId,
        title: sa.title ?? sa.coloringImage?.title ?? t('untitled'),
      }))}
      labels={{
        title: t('title'),
        empty: t('empty'),
        seeAll: t('seeAll'),
      }}
    />
  );
};

export default MyRecentArtwork;
