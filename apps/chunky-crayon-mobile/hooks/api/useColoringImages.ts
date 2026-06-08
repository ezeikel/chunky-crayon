import { useInfiniteQuery } from "@tanstack/react-query";
import { getColoringImages } from "@/api";
import { ColoringImage } from "@/types";

type ColoringImagesPage = {
  coloringImages: ColoringImage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UseColoringImagesOpts = {
  /** Category slug — filters the library by that category's tag set. */
  category?: string;
  /** Difficulty slug (beginner|intermediate|advanced|expert). */
  difficulty?: string;
};

// Browse the public library. With no opts → the full library (the existing
// behaviour). A `category`/`difficulty` keys a SEPARATE cache so switching
// categories doesn't clobber the all-pages list.
const useColoringImages = (opts?: UseColoringImagesOpts) =>
  useInfiniteQuery<ColoringImagesPage>({
    queryKey: [
      "coloringImages",
      opts?.category ?? null,
      opts?.difficulty ?? null,
    ],
    queryFn: ({ pageParam }) =>
      getColoringImages(pageParam as string | undefined, opts),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

export default useColoringImages;
