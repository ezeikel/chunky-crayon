import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid/GalleryGrid";
import { getDailyImages, getLatestDailyImage } from "@/app/data/gallery";

export const metadata: Metadata = {
  title: "Daily Coloring Pages",
  description:
    "Discover a new intricate coloring page every day. Our AI-generated daily designs feature seasonal themes, cultural celebrations, and artistic styles perfect for mindful relaxation.",
  openGraph: {
    title: "Daily Coloring Pages | Coloring Habitat",
    description:
      "A fresh, beautifully designed coloring page every day. Seasonal themes, global art traditions, and intricate patterns for adult coloring enthusiasts.",
    type: "website",
  },
};

const DailyGalleryPage = async () => {
  await connection();

  const [data, latestDaily] = await Promise.all([
    getDailyImages(),
    getLatestDailyImage(),
  ]);

  return (
    <>
      <main className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Daily Coloring Pages
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            A fresh, AI-generated coloring page every day — inspired by the
            season, cultural celebrations, and trending art styles
          </p>

          {latestDaily && (
            <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Today&apos;s Daily Page
              </p>
              <Link
                href={`/coloring-image/${latestDaily.id}`}
                className="mt-1 block text-lg font-semibold text-foreground hover:underline"
              >
                {latestDaily.title || "Today's coloring page"}
              </Link>
              {latestDaily.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {latestDaily.description}
                </p>
              )}
            </div>
          )}

          <nav className="mt-6 flex gap-2" aria-label="Gallery navigation">
            <Link
              href="/gallery"
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              All Pages
            </Link>
            <span className="inline-flex items-center rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background">
              Daily
            </span>
          </nav>

          <div className="mt-8">
            <Suspense
              fallback={
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-lg bg-secondary"
                    />
                  ))}
                </div>
              }
            >
              <GalleryGrid
                initialImages={data.images}
                initialCursor={data.nextCursor}
                initialHasMore={data.hasMore}
                galleryType="daily"
              />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
};

export default DailyGalleryPage;
