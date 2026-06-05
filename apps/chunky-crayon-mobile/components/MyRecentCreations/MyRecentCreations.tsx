import { useMemo } from "react";
import { useRouter } from "expo-router";
import useColoringImages from "@/hooks/api/useColoringImages";
import { useFeed } from "@/hooks/api";
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
  // The kid's IN-PROGRESS coloured work — the same `feed.inProgressWork` source
  // the My Art tab's "Keep Coloring" section renders. Each item carries a
  // `previewUrl` snapshot of the page as coloured so far, so the strip shows the
  // kid's progress instead of the blank line art. (My Art's SAVED archive is a
  // different source; the strip mirrors the home feed's in-progress preview.)
  const { data: feed } = useFeed();

  // coloringImageId → in-progress coloured preview snapshot.
  const colouredByImageId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of feed?.inProgressWork ?? []) {
      if (item.previewUrl && !map.has(item.coloringImageId)) {
        map.set(item.coloringImageId, item.previewUrl);
      }
    }
    return map;
  }, [feed?.inProgressWork]);

  const items: MyRecentCreationsItem[] = (data?.pages[0]?.coloringImages ?? [])
    .slice(0, MAX_ITEMS)
    .map((image) => ({
      id: image.id,
      // Prefer the kid's coloured save (shows their progress); fall back to the
      // line-art raster, then the SVG, so a never-touched page still renders.
      previewUrl: colouredByImageId.get(image.id) ?? image.url ?? null,
      svgUrl: image.svgUrl ?? null,
      title: image.title,
    }));

  return (
    <MyRecentCreationsView
      items={items}
      isLoading={isLoading}
      onItemPress={(item) => router.push(`/coloring-image/${item.id}`)}
      onSeeAllPress={() => router.push("/my-artwork")}
    />
  );
};

export default MyRecentCreations;
