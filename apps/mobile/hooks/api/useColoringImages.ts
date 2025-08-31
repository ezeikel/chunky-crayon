import { useQuery } from "@tanstack/react-query";
import { getColoringImages } from "@/api";
import { ColoringImage } from "@/types";

type ColoringImagesResponse = {
  coloringImages: ColoringImage[];
};

const useColoringImages = () =>
  useQuery<ColoringImagesResponse>({
    queryKey: ["coloringImages"],
    queryFn: getColoringImages,
  });

export default useColoringImages;
