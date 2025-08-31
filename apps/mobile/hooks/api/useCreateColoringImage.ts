import { useQuery } from "@tanstack/react-query";
import { createColoringImage } from "@/api";
import { ColoringImage } from "@/types";

type ColoringImageResponse = {
  coloringImage: ColoringImage;
};

const useCreateColoringImage = (description: string) =>
  useQuery<ColoringImageResponse>({
    queryKey: ["coloringImage", description],
    queryFn: () => createColoringImage(description),
  });

export default useCreateColoringImage;
