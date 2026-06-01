import { useRouter } from "expo-router";
import useColoringImages from "@/hooks/api/useColoringImages";
import { useT } from "@/lib/i18n/useT";
import MoreColoringPagesView from "./MoreColoringPagesView";
import type { MoreColoringPagesItem } from "./MoreColoringPagesView";

/**
 * "More Coloring Pages" grid for the coloring screen — the mobile,
 * tablet-portrait equivalent of web's related-pages section in
 * ColoringImageDetailView. Fills the vertical dead space below the canvas
 * on iPad portrait (the canvas is width-bound, so ~half the screen height
 * is otherwise empty).
 *
 * Bounded to 6 cards to match web's `getRelatedImages(id, tags, 6)` — no
 * infinite scroll (a 3-8yo benefits from a small, finishable set, same
 * rationale as MyRecentCreations). Mobile has no related-by-tags endpoint
 * yet, so this pulls the gallery's first page and excludes the current
 * image; visually identical to a kid, and avoids a new API surface.
 *
 * Data fetching is split from the view so Storybook renders the
 * populated / loading / empty states with mocks.
 */

const MAX_ITEMS = 6;

type MoreColoringPagesProps = {
  /** The coloring image currently open — excluded from the grid. */
  currentId: string;
  /** Screen width to size the grid into. */
  containerWidth: number;
};

const MoreColoringPages = ({
  currentId,
  containerWidth,
}: MoreColoringPagesProps) => {
  const router = useRouter();
  const t = useT();
  const { data, isLoading } = useColoringImages();

  const items: MoreColoringPagesItem[] = (data?.pages[0]?.coloringImages ?? [])
    .filter((image) => image.id !== currentId)
    .slice(0, MAX_ITEMS)
    .map((image) => ({
      id: image.id,
      svgUrl: image.svgUrl ?? null,
      title: image.title,
    }));

  return (
    <MoreColoringPagesView
      heading={t("coloringPage.relatedPages")}
      items={items}
      isLoading={isLoading}
      containerWidth={containerWidth}
      onItemPress={(item) => router.push(`/coloring-image/${item.id}`)}
    />
  );
};

export default MoreColoringPages;
