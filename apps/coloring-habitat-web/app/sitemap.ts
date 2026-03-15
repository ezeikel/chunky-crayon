import type { MetadataRoute } from "next";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

const BASE_URL = "https://coloringhabitat.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const images = await db.coloringImage.findMany({
    where: { brand: BRAND },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const imagePages: MetadataRoute.Sitemap = images.map((image) => ({
    url: `${BASE_URL}/coloring-image/${image.id}`,
    lastModified: image.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...imagePages];
}
