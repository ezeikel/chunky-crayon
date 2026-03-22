"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { GalleryImage } from "@/app/data/coloring-image";
import {
  loadGalleryImages,
  type GalleryType,
} from "@/app/actions/load-gallery-images";
import cn from "@/utils/cn";

type GalleryGridProps = {
  initialImages: GalleryImage[];
  initialCursor: string | null;
  initialHasMore: boolean;
  galleryType: GalleryType;
  categorySlug?: string;
  difficultySlug?: string;
  tagSlug?: string;
};

const DIFFICULTY_BADGE_COLORS: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-700",
  INTERMEDIATE: "bg-amber-100 text-amber-700",
  ADVANCED: "bg-blue-100 text-blue-700",
  EXPERT: "bg-purple-100 text-purple-700",
};

const GalleryGrid = ({
  initialImages,
  initialCursor,
  initialHasMore,
  galleryType,
  categorySlug,
  difficultySlug,
  tagSlug,
}: GalleryGridProps) => {
  const [images, setImages] = useState(initialImages);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor || !hasMore) return;

    startTransition(async () => {
      const result = await loadGalleryImages(
        galleryType,
        cursor,
        categorySlug,
        difficultySlug,
        tagSlug,
      );

      setImages((prev) => [...prev, ...result.images]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    });
  };

  if (images.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">
          No coloring pages found. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => {
          const imgSrc =
            ((image as Record<string, unknown>).url as string | undefined) ??
            image.svgUrl;
          const difficulty = (image as Record<string, unknown>).difficulty as
            | string
            | undefined;
          const tags =
            ((image as Record<string, unknown>).tags as string[]) ?? [];

          return (
            <Link
              key={image.id}
              href={`/coloring-image/${image.id}`}
              className="group"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                {imgSrc && (
                  <Image
                    src={imgSrc}
                    alt={image.title ?? "Coloring page"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                )}
                {difficulty && (
                  <span
                    className={cn(
                      "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm",
                      DIFFICULTY_BADGE_COLORS[difficulty] ??
                        "bg-white/90 text-foreground",
                    )}
                  >
                    {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-bold text-foreground line-clamp-1">
                  {image.title}
                </h3>
                {image.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {image.description}
                  </p>
                )}
                {tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className={cn(
              "rounded-full border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary",
              isPending && "cursor-wait opacity-60",
            )}
          >
            {isPending ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
};

export default GalleryGrid;
