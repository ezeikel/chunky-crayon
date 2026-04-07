import { getFeaturedImages } from "@/app/data/gallery";
import { GALLERY_CATEGORIES } from "@/constants";
import ShowcaseClient from "./ShowcaseClient";

export type ShowcaseImage = {
  id: string;
  title: string | null;
  svgUrl: string;
  tags: string[];
};

const ShowcaseSection = async () => {
  const images = await getFeaturedImages(12);
  const validImages: ShowcaseImage[] = images
    .filter((img) => !!img.svgUrl)
    .map((img) => ({
      id: img.id,
      title: img.title,
      svgUrl: img.svgUrl!,
      tags: img.tags,
    }));

  if (validImages.length === 0) return null;

  const categorySlugs = GALLERY_CATEGORIES.slice(0, 6).map((c) => ({
    slug: c.slug,
    name: c.name,
    tags: c.tags,
  }));

  return <ShowcaseClient images={validImages} categories={categorySlugs} />;
};

export default ShowcaseSection;
