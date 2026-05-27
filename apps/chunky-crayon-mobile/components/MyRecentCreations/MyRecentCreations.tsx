import { useRouter } from "expo-router";
import useColoringImages from "@/hooks/api/useColoringImages";
import MyRecentCreationsView from "./MyRecentCreationsView";
import type { MyRecentCreationsItem } from "./MyRecentCreationsView";

/**
 * Recent-creations strip for the home tab. Mobile port of
 * apps/chunky-crayon-web/components/MyRecentCreations/MyRecentCreations.tsx.
 *
 * Shows the active profile's last 10 generated coloring pages, most
 * recent first. Tapping a card routes back into the coloring canvas
 * for that image — the kid's "active workbench" view. Distinct from
 * the my-artwork tab (the archive of saved + colored work).
 *
 * Three brand rules baked in (mirroring web):
 *   1. Never community UGC — see memory feedback_cc_no_community_for_logged_in.
 *   2. useColoringImages filters by active profile server-side; the
 *      hook's first page is the right slice.
 *   3. Horizontal scroll, bounded to 10. No infinite scroll — 3-8yo
 *      benefits from a bounded set + a door to the rest.
 *
 * "See all my pictures" links to the my-artwork tab (the archive
 * door for saved + colored work).
 *
 * Data fetching is split from the view (MyRecentCreationsView) so
 * Storybook can render the empty / loading / populated states with
 * mock items without pulling in TanStack Query or the expo-router
 * navigation stack. Same pattern web ships.
 */

const MAX_ITEMS = 10;

const MyRecentCreations = () => {
  const router = useRouter();
  const { data, isLoading } = useColoringImages();

  // useColoringImages returns plain ColoringImage records (no
  // user-progress preview). The smart wrapper just forwards
  // `url` (line-art image) + `svgUrl` (line-art SVG fallback).
  // FeedColoringImage's `previewUrl` (user's in-progress save) is a
  // future enhancement when the recent-strip endpoint joins on
  // SavedArtwork.previewUrl — same as web's
  // getColoringImagesPaginated does server-side.
  const items: MyRecentCreationsItem[] = (data?.pages[0]?.coloringImages ?? [])
    .slice(0, MAX_ITEMS)
    .map((image) => ({
      id: image.id,
      previewUrl: image.url ?? null,
      svgUrl: image.svgUrl ?? null,
      title: image.title,
    }));

  return (
    <MyRecentCreationsView
      items={items}
      isLoading={isLoading}
      onItemPress={(item) => router.push(`/coloring-image/${item.id}`)}
      onSeeAllPress={() => router.push("/(tabs)/my-artwork")}
    />
  );
};

export default MyRecentCreations;
