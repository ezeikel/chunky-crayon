import { useQuery } from "@tanstack/react-query";
import { getColoringImage } from "@/api";
import { ColoringImage } from "@/types";

type ColoringImageResponse = {
  coloringImage: ColoringImage;
};

const useColoringImage = (id: string) =>
  useQuery<ColoringImageResponse>({
    queryKey: ["coloringImage", id],
    queryFn: () => getColoringImage(id),
  });

export default useColoringImage;
