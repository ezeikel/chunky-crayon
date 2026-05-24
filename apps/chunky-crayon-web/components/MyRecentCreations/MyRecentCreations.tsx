import { getTranslations, getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { getColoringImagesPaginated } from '@/app/data/coloring-image';
import { getActiveProfile } from '@/app/actions/profiles';
import { getColoringImageUrl } from '@/lib/seo/coloring-image-url';
import MyRecentCreationsView from './MyRecentCreationsView';

/**
 * Logged-in homepage's recent-creations strip.
 *
 * Shows the active profile's last 10 generated coloring pages (every
 * page they made, colored or not), most recent first. Tapping a card
 * routes back into the coloring canvas for that image — the kid's
 * "active workbench" view.
 *
 * Distinct from /account/my-stuff, which is the *archive* of saved
 * finished colored work (SavedArtwork). This strip is intentionally
 * the other thing: raw recent generations. The "See all my pictures"
 * door still points at /account/my-stuff because that IS the
 * destination for "show me everything I've made and saved".
 *
 * Three brand rules baked in:
 *   1. Logged-in surfaces never show community UGC — CC is for 3-8yo
 *      and we can't policy what other users created. See
 *      `feedback_cc_no_community_for_logged_in`.
 *   2. Filtered by active profile (each kid sees their own pile).
 *   3. Horizontal scroll on mobile, grid on desktop. No infinite
 *      scroll: 3-8yo finding things benefits from a bounded set + a
 *      door to the rest, not endless scrolling.
 *
 * Server-rendered. The presentation half (MyRecentCreationsView)
 * lives in its own file so Storybook can import it without dragging
 * the `@/auth` chain. Same pattern as GalleryStats.
 */

const MyRecentCreations = async () => {
  const session = await auth();
  if (!session?.user) return null;
  const userId = session.user.id;

  const [activeProfile, locale, t] = await Promise.all([
    getActiveProfile(),
    getLocale(),
    getTranslations('myRecentCreations'),
  ]);

  // getColoringImagesPaginated's signed-in + showCommunity=false branch
  // already returns exactly { userId, profileId, brand, status: READY }
  // ordered createdAt:desc — the active-workbench query we want. Pull
  // 10; older creations are one tap away on /account/my-stuff (saved)
  // or via re-generation.
  const { images } = await getColoringImagesPaginated(
    userId,
    activeProfile?.id,
    false,
    undefined,
    10,
  );

  return (
    <MyRecentCreationsView
      items={images.map((img) => ({
        id: img.id,
        // svgUrl is the colorable line-art. status:READY in the query
        // means it must exist, but the type is nullable — fall back to
        // empty string so Image still renders (Next/Image will error
        // visibly rather than crash the strip).
        imageUrl: img.svgUrl ?? '',
        href: getColoringImageUrl(img, locale),
        title: img.title ?? t('untitled'),
      }))}
      labels={{
        title: t('title'),
        empty: t('empty'),
        seeAll: t('seeAll'),
      }}
    />
  );
};

export default MyRecentCreations;
