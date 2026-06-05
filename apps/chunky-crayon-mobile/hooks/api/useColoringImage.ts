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
    // A row created via the worker/pending flow lands here as GENERATING with
    // no svgUrl; the worker flips it to READY out of band. Poll every 4s while
    // it's still GENERATING (or hasn't produced an svgUrl yet) so the screen
    // shows the finished page the moment it's ready, then stop polling. Same
    // pattern as useCharacters' GENERATING poll.
    refetchInterval: (query) => {
      const img = query.state.data?.coloringImage;
      if (!img) return false;
      const pending = img.status === "GENERATING" || !img.svgUrl;
      return pending && img.status !== "FAILED" ? 4000 : false;
    },
  });

export default useColoringImage;
