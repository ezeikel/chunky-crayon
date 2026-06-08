import { useQuery } from "@tanstack/react-query";
import { getCategoryCovers, type CategoryCover } from "@/api";

/**
 * One sample page (svgUrl) per category — drives the library's image-tile
 * category cards. Returns a slug→svgUrl lookup for easy use in CategoryRow/Grid.
 * Long staleTime: covers rarely change, and a tile gracefully falls back to the
 * FA icon while this loads or if a category has none.
 */
const useCategoryCovers = () => {
  const query = useQuery<CategoryCover[]>({
    queryKey: ["categoryCovers"],
    queryFn: getCategoryCovers,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const coverBySlug: Record<string, string | null> = {};
  for (const c of query.data ?? []) coverBySlug[c.slug] = c.svgUrl;

  return { ...query, coverBySlug };
};

export default useCategoryCovers;
