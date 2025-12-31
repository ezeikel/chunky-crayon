import { useInfiniteQuery } from "@tanstack/react-query";
import { getColoringImages } from "@/api";
import { ColoringImage } from "@/types";

type ColoringImagesPage = {
  coloringImages: ColoringImage[];
  nextCursor: string | null;
  hasMore: boolean;
};

const useColoringImages = () =>
  useInfiniteQuery<ColoringImagesPage>({
    queryKey: ["coloringImages"],
    queryFn: ({ pageParam }) =>
      getColoringImages(pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

export default useColoringImages;
