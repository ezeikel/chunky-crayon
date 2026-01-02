import { useQuery } from "@tanstack/react-query";
import { getFeed, FeedResponse } from "@/api";

const useFeed = () =>
  useQuery<FeedResponse>({
    queryKey: ["feed"],
    queryFn: getFeed,
  });

export default useFeed;
