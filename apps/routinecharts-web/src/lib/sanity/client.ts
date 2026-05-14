import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const SANITY_PROJECT_ID = "zeezp95x";
export const SANITY_DATASET = "routinecharts";
export const SANITY_API_VERSION = "2026-01-01";

export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
});

const builder = imageUrlBuilder(sanityClient);

export const urlForImage = (source: Parameters<typeof builder.image>[0]) =>
  builder.image(source);
